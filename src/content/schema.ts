/**
 * The lesson and glossary schemas, in a plain module so they can be checked outside Astro: the
 * unit tests validate every lesson against exactly this, which is what lets a writer check a
 * lesson without running a full build.
 */
import { z } from 'astro/zod';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every option explains itself, so a wrong pick gets feedback about that slip, not a generic "no". */
const option = z.object({ text: z.string().min(1), why: z.string().min(8) });

export const check = z
  .object({
    /** A situation with a choice to make, not a number to recall from the text. */
    q: z.string().min(12),
    options: z.array(option).min(2).max(4),
    answer: z.number().int().min(0),
  })
  .refine((c) => c.answer < c.options.length, { message: '`answer` must be the index of one of the options' });

/**
 * A mock phone screen, drawn in HTML and tokens. Never a screenshot, never a real brand. `kind`
 * sets only the caption above it ("Confirm transfer", "Email"); nothing new is drawn per kind.
 */
export const screen = z.object({
  kind: z.enum(['request', 'message', 'call', 'chat', 'qr', 'transfer', 'email']),
  from: z.string().min(2),
  lines: z.array(z.string().min(2)).min(1).max(4),
  amount: z.number().positive().max(10_000_000).optional(),
  /** Label of the button the scam wants pressed, e.g. "Enter UPI PIN to receive". */
  action: z.string().optional(),
});

/** The official route to report a scam. https only: it renders as a "report here" link, the worst place for a lookalike. */
export const reportToSchema = z.object({
  phone: z.string().regex(/^[0-9+][0-9 ]{2,19}$/).optional(),
  url: z.string().url().startsWith('https://'),
  label: z.string(),
});

/**
 * One drill situation in a lesson. `ordinary` marks a screen that is what it seems, so refusing
 * everything is never the answer; it is never rendered, only counted by the tests.
 */
export const drillScenario = z.object({ screen, check, ordinary: z.boolean().optional() });

const marginNumbers = { fixed: z.number().positive(), variable: z.number().nonnegative(), price: z.number().positive() };
const share = z.object({ label: z.string(), percent: z.number().min(0).max(100), hint: z.string().optional() });

const loanNumbers = {
  principal: z.number().positive(),
  /** Yearly interest rate in percent. An example the reader changes, never a promise. */
  rate: z.number().min(0).max(100),
  months: z.number().int().positive(),
};
const growthNumbers = {
  monthly: z.number().nonnegative(),
  rate: z.number().min(0).max(30),
  years: z.number().int().positive().max(50),
};

/** One line of a payslip, payout or award: what comes off, and the sentence a walkthrough reads under it. */
const deductionLine = z.object({
  label: z.string().min(2),
  amount: z.number().nonnegative(),
  /** For the stepped "show me" walkthrough. At most twenty words; the unit tests hold v2 lessons to it. */
  caption: z.string().max(160).optional(),
  /** Names the running figure after this line, e.g. "Gross salary". */
  subtotalLabel: z.string().optional(),
});
const deductionNumbers = {
  start: z.number().positive(),
  startLabel: z.string().min(2),
  lines: z.array(deductionLine).min(1).max(8),
  endLabel: z.string().min(2),
};

/**
 * For the stepped "show me" walkthrough (template v2): one caption per ledger line, in order, at
 * most twenty words each. margin gives two lines (what you keep, the count), loan and growth three,
 * split one per share. The deduction kind carries its captions on the lines themselves.
 */
const captions = { captions: z.array(z.string().max(160)).max(8).optional() };

const worked = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('margin'), context: z.string(), unitName: z.string(), ...marginNumbers, ...captions }),
  z.object({ kind: z.literal('split'), context: z.string(), income: z.number().positive(), shares: z.array(share).min(2), ...captions }),
  z.object({ kind: z.literal('loan'), context: z.string(), ...loanNumbers, ...captions }),
  z.object({ kind: z.literal('growth'), context: z.string(), ...growthNumbers, ...captions }),
  z.object({ kind: z.literal('deduction'), context: z.string(), ...deductionNumbers }),
]);

/**
 * Stepwise hints, Khan Academy's one-hint-per-step: the method, then the sum, then the answer.
 * Free to open (no penalty), because the struggling reader is who this is for.
 */
const hints = { hints: z.array(z.string().min(8).max(170)).min(1).max(3).optional() };

const practice = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('margin'), context: z.string(), unitName: z.string(), ...marginNumbers, ...hints }),
  z.object({
    kind: z.literal('split'),
    context: z.string(),
    income: z.number().positive(),
    shares: z.array(share).min(2),
    target: z.string(),
    ...hints,
  }),
  z.object({ kind: z.literal('loan'), context: z.string(), ...loanNumbers, ...hints }),
  z.object({ kind: z.literal('growth'), context: z.string(), ...growthNumbers, ...hints }),
  z.object({ kind: z.literal('deduction'), context: z.string(), ...deductionNumbers, ...hints }),
]);

const explorable = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('margin'),
    unitName: z.string(),
    fixed: z.number().positive(),
    variable: z.number().nonnegative(),
    /** Tap-to-try prices. Buttons, not a slider: sliders are imprecise at 360px and at 200% zoom. */
    prices: z.array(z.number().positive()).min(2).max(5),
    /** One or two guided "try this" prompts before free play. */
    prompts: z.array(z.string()).min(1).max(2),
  }),
  z.object({
    kind: z.literal('split'),
    incomes: z.array(z.number().positive()).min(2).max(5),
    lines: z.array(share).min(3).max(5),
    prompts: z.array(z.string()).min(1).max(2),
  }),
  z.object({
    kind: z.literal('loan'),
    principal: z.number().positive(),
    rate: z.number().min(0).max(100),
    /** Tap-to-try repayment lengths, in months. */
    terms: z.array(z.number().int().positive()).min(2).max(5),
    prompts: z.array(z.string()).min(1).max(2),
  }),
  z.object({
    kind: z.literal('growth'),
    /** Tap-to-try monthly amounts. */
    amounts: z.array(z.number().positive()).min(2).max(5),
    rate: z.number().min(0).max(30),
    /** Tap-to-try horizons, in years. */
    horizons: z.array(z.number().int().positive().max(50)).min(2).max(5),
    prompts: z.array(z.string()).min(1).max(2),
  }),
  z.object({
    kind: z.literal('deduction'),
    /** Tap-to-try starting figures, e.g. three CTCs. */
    starts: z.array(z.number().positive()).min(2).max(5),
    startLabel: z.string().min(2),
    lines: z
      .array(
        z.object({
          label: z.string().min(2),
          /** Either a fixed amount or a percent of the starting figure. */
          amount: z.number().nonnegative().optional(),
          percentOfStart: z.number().min(0).max(100).optional(),
          subtotalLabel: z.string().optional(),
        }),
      )
      .min(1)
      .max(8),
    endLabel: z.string().min(2),
    prompts: z.array(z.string()).min(1).max(2),
  }),
  z.object({
    kind: z.literal('drill'),
    intro: z.string(),
    scenarios: z.array(drillScenario).min(3).max(7),
    /** One reflection line at the end; the simulation effect is much larger with one. */
    reflection: z.string(),
  }),
]);

export const lessonSchema = z
    .object({
      title: z.string().refine((t) => t.trim().split(/\s+/).length <= 12, 'Keep titles to about 6-10 words'),
      summary: z.string().max(120),
      region: z.enum(['in', 'eu', 'us']),
      track: z.enum(['money-basics', 'start-something', 'how-business-works', 'credit-and-fraud', 'protect-your-money']),
      order: z.number().int().positive(),
      lang: z.string().default('en'),
      translationOf: z.string().nullable().default(null),
      readingMinutes: z.number().int().min(3).max(10),
      level: z.enum(['beginner', 'intermediate']).default('beginner'),
      /** First name and country only. */
      author: z.object({ name: z.string().regex(/^\S+$/, 'First name only'), country: z.string().length(2) }),
      /** A role, never a minor's full name. */
      reviewedBy: z.string(),
      lastReviewed: z.coerce.date(),

      /** The moment this lesson is for: "you just got X". One or two sentences. */
      situation: z.string().min(40),
      /** A guess made before teaching (template v1). Never scored, never stored. v2 opens with the document's "find this line" instead. */
      prediction: check.optional(),
      takeaways: z.array(z.string().min(10)).length(3),
      worked: worked.optional(),
      explorable: explorable.optional(),
      practice: practice.optional(),
      /** "One more": the same skill again with different numbers, after the first practice. */
      practiceMore: practice.optional(),
      /** One sentence after "show me" that states the rule the calculation just showed. */
      keyIdea: z.string().min(12).max(170).optional(),
      quiz: z.array(check).min(3).max(5),
      /** Where the reader will meet this outside the lesson. */
      transfer: z.array(z.string()).min(2).max(4),

      /**
       * Lesson template. v1 is the 2026-09-20 shape. v2 (2026-09-21) opens with the moment and a
       * video, then "show me" (the calculation one line at a time), your turn, change one thing,
       * three actions, a details fold, three checks. New content rules apply to v2 only until all
       * 36 lessons carry it.
       */
      template: z.enum(['v1', 'v2']).default('v1'),
      /** "After this you can…": three lines, each matching one end-of-lesson check. */
      objectives: z.array(z.string().min(10).max(110)).length(3).optional(),
      /** One short video that teaches the idea, shown in a click-to-load player behind the embeds consent. */
      video: z
        .object({
          youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'An 11-character YouTube id'),
          title: z.string().min(4).max(110),
          channel: z.string().min(2).max(60),
          minutes: z.number().positive().max(30),
          language: z.string().default('en'),
          /** Start and stop here when only part of the video teaches the idea. */
          startSeconds: z.number().int().nonnegative().optional(),
          endSeconds: z.number().int().positive().optional(),
          /** One sentence of context, e.g. "Made for the US; the idea is the same." */
          note: z.string().max(160).optional(),
        })
        .optional(),
      /** The real artefact, drawn in tokens (never a screenshot, never a real brand), with one "find this line" question. */
      document: z
        .object({
          kind: z.enum(['payslip', 'statement', 'offer', 'loan-sheet', 'payout', 'app-screen']),
          title: z.string().min(2).max(60),
          lines: z.array(z.object({ label: z.string().min(1), value: z.string().min(1), hint: z.string().max(140).optional() })).min(2).max(12),
          find: check,
        })
        .optional(),
      /** Law, dates, thresholds and statistics that change nothing the reader does: folded away. No check may depend on them. */
      details: z.array(z.string().min(10)).max(10).optional(),

      glossary: z.array(z.string()).default([]),
      /** Slug of the tool a reader uses with their own numbers after this lesson. */
      tool: z.string().optional(),
      /** Up to two more tools the lesson links to by name (src/lib/tools.ts lessonToolLinks). */
      moreTools: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(2).optional(),
      /** Scam lessons end with the official reporting route for their edition. */
      reportTo: reportToSchema.optional(),
      sources: z
        .array(z.object({ title: z.string(), url: z.string().url().startsWith('https://'), publisher: z.string() }))
        .min(2),

      /** Set when the lesson quotes any market price or index level. */
      marketData: z.boolean().default(false),
      dataAsOf: z.coerce.date().optional(),
    })
    // SEBI's education-only rule: market prices in educational material must be lagged. We hold
    // every edition to the 30-day version. tests/unit/lessons.test.ts also reads the prose, since
    // a flag only proves what the author declared.
    .refine((l) => !l.marketData || l.dataAsOf !== undefined, {
      message: 'marketData: true needs a dataAsOf date',
      path: ['dataAsOf'],
    })
    .refine((l) => !l.dataAsOf || l.lastReviewed.getTime() - l.dataAsOf.getTime() >= 30 * DAY_MS, {
      message: 'Market data must be at least 30 days older than lastReviewed (SEBI education-only rule)',
      path: ['dataAsOf'],
    });

export const glossarySchema = z.object({
  term: z.string(),
  define: z.string().min(20),
  example: z.string().min(10),
  /** Set for romanised words from another language, e.g. "hi-Latn" for udhaar. */
  lang: z.string().optional(),
});

/**
 * A drill tool's own situations for one edition: src/content/drills/<edition>/<tool>.json. The
 * page shows the fromLesson's screens first, then these.
 *
 * A bank scenario's id is permanent once shipped: it is the reader's review key
 * ('<edition>/tools/<tool>#<id>'), so renaming one orphans every reader's review item. It never
 * starts with q (LessonScript scores '#q1' as a quiz) or d plus a digit (a lesson's '#d1'), and
 * holds no '#' or '/'.
 */
export const BANK_SCENARIO_ID = /^(?!q)(?!d\d)[a-z][a-z0-9-]{2,39}$/;

export const drillBankSchema = z
  .object({
    tool: z.string().regex(/^[a-z0-9-]+$/),
    region: z.enum(['in', 'eu', 'us']),
    fromLesson: z.string().regex(/^(in|eu|us)\/[a-z-]+\/[a-z0-9-]+$/),
    intro: z.string().min(20).max(200),
    reflection: z.string().min(20).max(200),
    /** A line under the intro saying what the set covers, e.g. the euro area only. */
    scopeNote: z.string().max(400).optional(),
    /** Default: the fromLesson's. */
    reportTo: reportToSchema.optional(),
    glossary: z.array(z.string()).default([]),
    sources: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          title: z.string().min(4),
          url: z.string().url().startsWith('https://'),
          publisher: z.string().min(2),
        }),
      )
      .default([]),
    /** The day every invented name on a screen was searched for a real business. */
    namesCheckedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    inventedNames: z.array(z.string().min(2)).default([]),
    /** Empty in a stub bank: its builder adds the situations. */
    scenarios: z
      .array(
        z.object({
          id: z.string().regex(BANK_SCENARIO_ID),
          ordinary: z.boolean(),
          flow: z.enum(['to-you', 'from-you', 'through-you']).optional(),
          sourceIds: z.array(z.string()).default([]),
          screen,
          check,
        }),
      )
      .max(4),
  })
  .superRefine((bank, ctx) => {
    const seen = new Set<string>();
    bank.scenarios.forEach((scenario, index) => {
      if (seen.has(scenario.id)) {
        ctx.addIssue({ code: 'custom', path: ['scenarios', index, 'id'], message: `Scenario id "${scenario.id}" is used twice in this bank` });
      }
      seen.add(scenario.id);
    });
    const sourceIds = new Set(bank.sources.map((source) => source.id));
    bank.scenarios.forEach((scenario, index) => {
      scenario.sourceIds.forEach((id, j) => {
        if (!sourceIds.has(id)) {
          ctx.addIssue({ code: 'custom', path: ['scenarios', index, 'sourceIds', j], message: `Source id "${id}" is not in this bank's sources` });
        }
      });
    });
  });

export type DrillBankData = z.infer<typeof drillBankSchema>;
export type DrillScreen = z.infer<typeof screen>;
export type DrillCheck = z.infer<typeof check>;
