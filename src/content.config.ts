import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every option explains itself, so a wrong pick gets feedback about that slip, not a generic "no". */
const option = z.object({ text: z.string().min(1), why: z.string().min(8) });

const check = z
  .object({
    /** A situation with a choice to make, not a number to recall from the text. */
    q: z.string().min(12),
    options: z.array(option).min(2).max(4),
    answer: z.number().int().min(0),
  })
  .refine((c) => c.answer < c.options.length, { message: '`answer` must be the index of one of the options' });

/** A mock phone screen, drawn in HTML and tokens. Never a screenshot, never a real brand. */
const screen = z.object({
  kind: z.enum(['request', 'message', 'call', 'chat', 'qr']),
  from: z.string().min(2),
  lines: z.array(z.string().min(2)).min(1).max(4),
  amount: z.number().positive().optional(),
  /** Label of the button the scam wants pressed, e.g. "Enter UPI PIN to receive". */
  action: z.string().optional(),
});

const marginNumbers = { fixed: z.number().positive(), variable: z.number().nonnegative(), price: z.number().positive() };
const share = z.object({ label: z.string(), percent: z.number().min(0).max(100), hint: z.string().optional() });

const worked = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('margin'), context: z.string(), unitName: z.string(), ...marginNumbers }),
  z.object({ kind: z.literal('split'), context: z.string(), income: z.number().positive(), shares: z.array(share).min(2) }),
]);

const practice = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('margin'), context: z.string(), unitName: z.string(), ...marginNumbers }),
  z.object({
    kind: z.literal('split'),
    context: z.string(),
    income: z.number().positive(),
    shares: z.array(share).min(2),
    target: z.string(),
  }),
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
    kind: z.literal('drill'),
    intro: z.string(),
    scenarios: z.array(z.object({ screen, check })).min(3).max(7),
    /** One reflection line at the end; the simulation effect is much larger with one. */
    reflection: z.string(),
  }),
]);

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z
    .object({
      title: z.string().refine((t) => t.trim().split(/\s+/).length <= 12, 'Keep titles to about 6-10 words'),
      summary: z.string().max(120),
      region: z.enum(['in', 'eu', 'us']),
      track: z.enum(['money-basics', 'start-something', 'how-business-works']),
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
      /** A guess made before teaching. Never scored, never stored. */
      prediction: check,
      takeaways: z.array(z.string().min(10)).length(3),
      worked: worked.optional(),
      explorable: explorable.optional(),
      practice: practice.optional(),
      quiz: z.array(check).min(3).max(5),
      /** Where the reader will meet this outside the lesson. */
      transfer: z.array(z.string()).min(2).max(4),

      glossary: z.array(z.string()).default([]),
      /** Slug of the full calculator this lesson hands off to. */
      tool: z.string().optional(),
      /** Scam lessons end with the official reporting route for their edition. */
      // https only: this renders as a "report here" link on a scam lesson, the worst place for a lookalike.
      reportTo: z
        .object({ phone: z.string().regex(/^[0-9+][0-9 ]{2,19}$/).optional(), url: z.string().url().startsWith('https://'), label: z.string() })
        .optional(),
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
    }),
});

const glossary = defineCollection({
  loader: file('src/content/glossary.json'),
  schema: z.object({
    term: z.string(),
    define: z.string().min(20),
    example: z.string().min(10),
    /** Set for romanised words from another language, e.g. "hi-Latn" for udhaar. */
    lang: z.string().optional(),
  }),
});

export const collections = { lessons, glossary };
