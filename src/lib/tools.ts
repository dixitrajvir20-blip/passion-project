/**
 * The tools, in one place: the index page, the tool pages, the lesson hand-offs and the tests all
 * read this. Pure TypeScript with no astro:* import, because Playwright imports it too.
 *
 * Registry copy (title, answers, short, intro, minutes) is fixed here by the foundation. A tool's
 * own numbers and rules live in src/lib/tools/<slug>.ts; import those by their full path.
 *
 * A calculator whose island is still a stub carries a false `ready` flag and is shown nowhere;
 * its builder deletes that one line when the island is real.
 */

export type ToolFormat = 'calculator' | 'drill';
export type ToolGroup = 'first-pay' | 'buffer' | 'borrowing' | 'moving-out' | 'own-work' | 'scams';

export interface ToolGroupMeta {
  id: ToolGroup;
  title: string;
  /** The group in a phrase, for the index page's description. */
  phrase: string;
}

/** The life moments the tools are grouped by, in page order. */
export const GROUPS: ToolGroupMeta[] = [
  { id: 'first-pay', title: 'Your first pay', phrase: 'your first pay' },
  { id: 'buffer', title: 'A buffer for a bad month', phrase: 'a buffer' },
  { id: 'borrowing', title: 'Borrowing and paying later', phrase: 'borrowing' },
  { id: 'moving-out', title: 'Moving out', phrase: 'moving out' },
  { id: 'own-work', title: 'Working for yourself', phrase: 'working for yourself' },
  { id: 'scams', title: 'Before you send, sign or reply', phrase: 'spotting scams' },
];

export interface ToolMeta {
  slug: string;
  title: string;
  /** An edition's own title where it differs ("UPI: spot the fake" in India). */
  titles?: Partial<Record<'in' | 'eu' | 'us', string>>;
  /** The one question it answers, in the reader's words. */
  answers: string;
  /** The same question in a few words, for the giant stacked list on the front pages. */
  short: string;
  /** One line under the title on the tool page. */
  intro: string;
  /** A calculator takes the reader's numbers; a drill is a run of made-up screens to decide. */
  format: ToolFormat;
  group: ToolGroup;
  /** About how long it takes, in whole minutes. */
  minutes: number;
  /** Editions it appears in; omitted means all. */
  regions?: string[];
  /**
   * false while the tool's island is still a stub. Such a tool has no page, no index row, no line
   * on the fronts and no lesson hand-off, so a placeholder is never where the real thing should
   * be. Its builder deletes the line when the island is real; the release check allows none.
   */
  ready?: false;
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'take-home-pay',
    title: 'Take-home pay, line by line',
    answers: 'How much of my pay actually reaches my account?',
    short: 'What reaches my account?',
    intro: 'Answers one question: once every line on your payslip comes off, what reaches your account?',
    format: 'calculator',
    group: 'first-pay',
    minutes: 3,
  },
  {
    slug: 'budget',
    title: 'Budget planner',
    answers: 'Where does my money actually go each month?',
    short: 'Where does my money go?',
    intro: 'Answers one question: once everything has a line, is there anything left?',
    format: 'calculator',
    group: 'first-pay',
    minutes: 4,
  },
  {
    slug: 'buffer-target',
    title: 'Buffer target and the payday it is reached',
    answers: 'On which payday will a buffer for my must-pay costs be ready?',
    short: 'When will my buffer be ready?',
    intro: 'Answers one question: on which payday is a buffer for your must-pay costs fully set aside?',
    format: 'calculator',
    group: 'buffer',
    minutes: 2,
  },
  {
    slug: 'savings',
    title: 'Savings growth',
    answers: 'What does a small monthly amount turn into over years?',
    short: 'What could my savings become?',
    intro: 'Answers one question: what does a small amount, put aside every month, turn into?',
    format: 'calculator',
    group: 'buffer',
    minutes: 2,
  },
  {
    slug: 'loan',
    title: 'Loan repayments',
    answers: 'What does borrowing this actually cost me?',
    short: 'What does this loan really cost?',
    intro: 'Answers one question: what does this loan cost each month, and in total?',
    format: 'calculator',
    group: 'borrowing',
    minutes: 2,
  },
  {
    slug: 'yearly-rate',
    title: "A loan's cost as a yearly rate",
    answers: 'I get this much and pay back that much: what is that as a yearly rate?',
    short: 'What is this loan as a yearly rate?',
    intro: "Answers one question: whatever the charge is called, a fee, a flat rate or 'no-cost', what does it come to over a year?",
    format: 'calculator',
    group: 'borrowing',
    minutes: 2,
    regions: ['in'],
  },
  {
    slug: 'card-minimum',
    title: 'Card balance at the minimum payment',
    answers: 'If I pay only the minimum, how long does my card take to clear, and what does it cost?',
    short: 'How long does the minimum take?',
    intro: 'Answers one question: paying only the minimum, how many months until the balance is gone, and how much of what you pay is interest?',
    format: 'calculator',
    group: 'borrowing',
    minutes: 2,
    regions: ['in', 'us'],
  },
  {
    slug: 'pay-later-payday',
    title: 'Pay-later plans against one payday',
    answers: 'What is left of this pay once my pay-later plans take their share before the next payday?',
    short: 'What do my pay-later plans leave?',
    intro: 'Answers one question: after living costs and every pay-later payment due before your next pay, what is left of this pay?',
    format: 'calculator',
    group: 'borrowing',
    minutes: 2,
    regions: ['eu', 'us'],
  },
  {
    slug: 'rent-share',
    title: 'Rent and bills as a share of net pay',
    answers: 'How much of my net pay would this room take?',
    short: 'How much of my pay goes on rent and bills?',
    intro: 'Answers one question: rent and bills together, what share of your net pay do they take?',
    format: 'calculator',
    group: 'moving-out',
    minutes: 2,
    regions: ['eu'],
  },
  {
    slug: 'side-hustle',
    title: 'Side-hustle profit',
    answers: 'Is this worth the hours I put into it?',
    short: 'Is this worth my time?',
    intro: 'Answers one question: after costs and fees, what does this pay per hour?',
    format: 'calculator',
    group: 'own-work',
    minutes: 2,
  },
  {
    slug: 'break-even',
    title: 'Break-even calculator',
    answers: 'How many do I need to sell before I stop losing money?',
    short: 'How many do I need to sell?',
    intro: 'Answers one question: how many do you have to sell before you stop losing money?',
    format: 'calculator',
    group: 'own-work',
    minutes: 2,
  },
  {
    slug: 'side-income-tax',
    title: 'Tax on side income and fees',
    answers: 'How much tax is still to pay, or to come back, on what my work brought in?',
    short: 'What tax is left on my side income?',
    intro: 'Answers one question: after what was already taken or paid, how much tax is left to pay, or comes back?',
    format: 'calculator',
    group: 'own-work',
    minutes: 2,
    regions: ['in', 'us'],
  },
  {
    slug: 'spot-the-fake',
    title: 'Payments: spot the fake',
    titles: { in: 'UPI: spot the fake' },
    answers: 'Would I catch a payment scam before I tapped?',
    short: 'Would I catch a payment scam?',
    intro: 'Made-up screens, real patterns. Decide what each one is before you look.',
    format: 'drill',
    group: 'scams',
    minutes: 5,
    regions: ['in', 'eu'],
  },
  {
    slug: 'job-offer-check',
    title: 'Job offers: spot the fake',
    answers: 'Would I spot a fake job offer before I replied?',
    short: 'Would I spot a fake job?',
    intro: 'Made-up job messages, real patterns. Decide what each one is before you look.',
    format: 'drill',
    group: 'scams',
    minutes: 5,
  },
];

/**
 * Every tool an edition lists, ready or not: for checking that a lesson or a bank names a tool its
 * edition will have. Pages, rows, panels and hand-offs use toolsFor.
 */
export const registeredFor = (region: string): ToolMeta[] => TOOLS.filter((tool) => !tool.regions || tool.regions.includes(region));

/** The edition's tools that are ready to show: the only ones that get a page or a link. */
export const toolsFor = (region: string): ToolMeta[] => registeredFor(region).filter((tool) => tool.ready !== false);

/** The tool's title in one edition. */
export const titleFor = (tool: ToolMeta, region: string): string => tool.titles?.[region as 'in' | 'eu' | 'us'] ?? tool.title;

export const toolBySlug = (slug: string): ToolMeta | undefined => TOOLS.find((tool) => tool.slug === slug);

/** The groups that have tools, in GROUPS order, each with its tools in TOOLS order. */
export function groupsFor(region: string, tools: ToolMeta[] = toolsFor(region)): { group: ToolGroupMeta; tools: ToolMeta[] }[] {
  return GROUPS.map((group) => ({ group, tools: TOOLS.filter((t) => t.group === group.id && tools.includes(t)) })).filter(
    (entry) => entry.tools.length > 0,
  );
}

/** The calculator each lesson explorer opens, fixed by the explorer's kind. */
export const EXPLORER_TOOL = { margin: 'break-even', split: 'budget', loan: 'loan', growth: 'savings' } as const;

export interface ToolLink {
  tool: ToolMeta;
  text: string;
}

/**
 * The named links from a lesson to its tools: tool first, then moreTools, without the one its
 * explorer already opens, and only tools this edition has ready. A drill link names the drill; a
 * calculator link asks its short question ("Try your own numbers: what reaches my account?").
 */
export function lessonToolLinks(
  region: string,
  tool: string | undefined,
  moreTools: readonly string[] | undefined,
  explorableKind: string | undefined,
  available: readonly ToolMeta[] = toolsFor(region),
): ToolLink[] {
  const explorer = explorableKind ? (EXPLORER_TOOL as Record<string, string>)[explorableKind] : undefined;
  const slugs = [...new Set([tool, ...(moreTools ?? [])].filter((s): s is string => typeof s === 'string'))];
  return slugs
    .filter((slug) => slug !== explorer)
    .map((slug) => available.find((t) => t.slug === slug))
    .filter((t): t is ToolMeta => t !== undefined)
    .map((t) => ({
      tool: t,
      text:
        t.format === 'drill'
          ? `Practise on more situations in “${titleFor(t, region)}”`
          : `Try your own numbers: ${t.short.charAt(0).toLowerCase()}${t.short.slice(1)}`,
    }));
}

/** "Calculator, about 2 minutes" or "Drill, 6 situations, about 5 minutes". */
export function toolMetaLine(tool: ToolMeta, situations?: number): string {
  const m = tool.minutes;
  const about = `about ${m} ${m === 1 ? 'minute' : 'minutes'}`;
  if (tool.format === 'calculator') return `Calculator, ${about}`;
  return situations !== undefined ? `Drill, ${situations} situations, ${about}` : `Drill, ${about}`;
}
