/** The calculators, in one place: the index page, the tool pages and the tests all read this. */

export interface ToolMeta {
  slug: string;
  title: string;
  /** The one question it answers, in the reader's words. */
  answers: string;
  /** One line under the title on the tool page. */
  intro: string;
  /** Editions it appears in; omitted means all. */
  regions?: string[];
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'break-even',
    title: 'Break-even calculator',
    answers: 'How many do I need to sell before I stop losing money?',
    intro: 'Answers one question: how many do you have to sell before you stop losing money?',
  },
  {
    slug: 'budget',
    title: 'Budget planner',
    answers: 'Where does my money actually go each month?',
    intro: 'Answers one question: once everything has a line, is there anything left?',
  },
  {
    slug: 'savings',
    title: 'Savings growth',
    answers: 'What does a small monthly amount turn into over years?',
    intro: 'Answers one question: what does a small amount, put aside every month, turn into?',
  },
  {
    slug: 'side-hustle',
    title: 'Side-hustle profit',
    answers: 'Is this worth the hours I put into it?',
    intro: 'Answers one question: after costs and fees, what does this pay per hour?',
  },
  {
    slug: 'loan',
    title: 'Loan repayments',
    answers: 'What does borrowing this actually cost me?',
    intro: 'Answers one question: what does this loan cost each month, and in total?',
  },
  {
    slug: 'spot-the-fake',
    title: 'UPI: spot the fake',
    answers: 'Would I catch a payment scam before I tapped?',
    intro: 'Made-up screens, real patterns. Decide what each one is before you look.',
    regions: ['in'],
  },
];

export const toolsFor = (region: string): ToolMeta[] => TOOLS.filter((tool) => !tool.regions || tool.regions.includes(region));
