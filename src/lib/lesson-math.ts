/**
 * Worked examples and practice steps, computed at build time from the same tested functions the
 * calculators use. A lesson passes numbers; it never types out arithmetic. One slip in a worked
 * example teaches the wrong procedure, and no amount of source-checking would catch it.
 */
import { breakEven, compoundGrowth, deductions, emi } from './finance';

export interface MarginNumbers {
  /** What you pay each month whatever you sell. */
  fixed: number;
  /** What one unit costs to make. */
  variable: number;
  price: number;
}

export interface SplitNumbers {
  income: number;
  /** Percentages; they do not have to sum to 100 (the rest is "left over"). */
  shares: { label: string; percent: number }[];
}

export interface LoanNumbers {
  principal: number;
  /** Yearly rate, percent. */
  rate: number;
  months: number;
}

export interface GrowthNumbers {
  monthly: number;
  /** Yearly rate, percent: an example, never a promise. */
  rate: number;
  years: number;
}

export interface Step {
  label: string;
  /** Left-hand side of the calculation, as amounts and operators. */
  parts: ({ money: number } | { count: number } | { op: string })[];
  result: { money: number } | { count: number };
  note?: string;
  /** One sentence a "show me" walkthrough reads under the line: what it is, who gets it. */
  caption?: string;
}

export interface DeductionNumbers {
  /** The figure the story opens with: the CTC, the gross, the price, the award. */
  start: number;
  startLabel: string;
  lines: { label: string; amount: number; caption?: string; subtotalLabel?: string }[];
  /** What the last running figure is called: in-hand pay, net pay, what arrives. */
  endLabel: string;
}

export interface Choice {
  value: { money: number } | { count: number };
  correct: boolean;
  /** Feedback for picking this one: names the slip, never the reader. */
  why: string;
}

export function marginSteps(n: MarginNumbers, unitName: string): Step[] {
  const be = breakEven(n.fixed, n.variable, n.price);
  const steps: Step[] = [
    {
      label: 'What you keep from one sale',
      parts: [{ money: n.price }, { op: '−' }, { money: n.variable }],
      result: { money: be.contributionMargin },
    },
  ];
  if (be.viable) {
    steps.push({
      label: `${cap(unitName)} needed to cover the month`,
      parts: [{ money: n.fixed }, { op: '÷' }, { money: be.contributionMargin }],
      result: { count: be.units! },
      note:
        n.fixed % be.contributionMargin === 0
          ? undefined
          : `Rounded up from ${(n.fixed / be.contributionMargin).toFixed(1)}, because you cannot sell part of one.`,
    });
  }
  return steps;
}

/**
 * The last step of a near-identical problem, with the answer hidden among the three slips
 * people actually make. Ascending order, so nothing about position hints at the answer.
 */
export function marginChoices(n: MarginNumbers): Choice[] {
  const be = breakEven(n.fixed, n.variable, n.price);
  if (!be.viable) throw new Error('Practice numbers must have a price above the cost to make one.');
  const margin = be.contributionMargin;
  const right = be.units!;

  const candidates: Choice[] = [
    { value: { count: right }, correct: true, why: `Fixed costs ÷ what you keep per sale, rounded up to a whole one.` },
    {
      value: { count: Math.ceil(n.fixed / n.price) },
      correct: false,
      why: 'That divides by the full price. Part of every sale goes on making it, so only what you keep can pay the fixed costs.',
    },
    {
      value: { count: Math.ceil(n.fixed / n.variable) },
      correct: false,
      why: 'That divides by the cost to make one. The costs are covered by what is left after that cost, not by the cost itself.',
    },
    {
      value: { count: Math.floor(n.fixed / margin) === right ? right - 1 : Math.floor(n.fixed / margin) },
      correct: false,
      why: 'One short. At that number you are still a little under your fixed costs, so it rounds up, not down.',
    },
  ];

  return dedupe(candidates).sort((a, b) => num(a) - num(b));
}

export function splitSteps(n: SplitNumbers): Step[] {
  return n.shares.map((share) => ({
    label: share.label,
    parts: [{ money: n.income }, { op: '×' }, { op: `${share.percent}%` }],
    result: { money: Math.round((n.income * share.percent) / 100) },
  }));
}

/**
 * "How much goes to <target>?" The other shares' amounts are already on screen in the given steps,
 * so they make poor wrong answers. These are the slips people actually make with a percentage.
 */
export function splitChoices(n: SplitNumbers, targetLabel: string): Choice[] {
  const target = n.shares.find((s) => s.label === targetLabel);
  if (!target) throw new Error(`No share called "${targetLabel}".`);
  const first = n.shares[0];
  const amount = Math.round((n.income * target.percent) / 100);

  const candidates: Choice[] = [
    { value: { money: amount }, correct: true, why: `${target.percent}% of the total: multiply by ${target.percent}, then divide by 100.` },
    {
      value: { money: Math.round(n.income / target.percent) },
      correct: false,
      why: `That divides by ${target.percent}. A percentage means "out of 100", so it is × ${target.percent} ÷ 100.`,
    },
    {
      value: { money: Math.round((n.income * target.percent) / 1000) },
      correct: false,
      why: `The decimal point slipped one place. ${target.percent}% is ${(target.percent / 100).toFixed(2)} of the total, not ${(target.percent / 1000).toFixed(3)}.`,
    },
    {
      value: { money: Math.round(((n.income - (n.income * first.percent) / 100) * target.percent) / 100) },
      correct: false,
      why: `That takes ${target.percent}% of what is left after ${first.label.toLowerCase()}. Every share is a share of the whole amount.`,
    },
  ];

  return dedupe(candidates).sort((a, b) => num(a) - num(b));
}

/**
 * A payslip (or any chain of subtractions) as one line per deduction: what it was, minus this line,
 * what is left. The last line is the answer. Captions ride along for the stepped walkthrough.
 */
export function deductionSteps(n: DeductionNumbers): Step[] {
  const result = deductions(n.start, n.lines);
  return n.lines.map((line, index) => {
    const before = index === 0 ? n.start : result.running[index - 1];
    const last = index === n.lines.length - 1;
    const name = line.label.charAt(0).toLowerCase() + line.label.slice(1);
    return {
      // The row says what the figure is (gross salary, in-hand pay); the sum under it names the line that came off.
      label: last ? n.endLabel : (line.subtotalLabel ?? 'Left'),
      parts: [{ money: before }, { op: '−' }, { money: line.amount }, { op: name }],
      result: { money: result.running[index] },
      caption: line.caption,
    };
  });
}

/**
 * "What arrives?" The slips: stopping after the first line, forgetting every line, or taking one
 * line off twice. Ascending order, so position gives nothing away.
 */
export function deductionChoices(n: DeductionNumbers): Choice[] {
  const result = deductions(n.start, n.lines);
  const first = n.lines[0];
  const candidates: Choice[] = [
    { value: { money: result.net }, correct: true, why: `${n.startLabel} minus every line, in order.` },
    { value: { money: n.start }, correct: false, why: `That is the ${n.startLabel.toLowerCase()} before any line comes off. Nothing has been taken away yet.` },
    { value: { money: result.running[0] }, correct: false, why: `That stops after ${first.label.toLowerCase()}. The lines after it come off too.` },
    { value: { money: round2(result.net - first.amount) }, correct: false, why: `That takes ${first.label.toLowerCase()} off twice. Each line comes off once.` },
  ];
  return dedupe(candidates).sort((a, b) => num(a) - num(b));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A loan as three lines: the monthly payment, what that adds up to, and the difference, which is
 * what borrowing costs. The payment is rounded to the paisa or cent first, as a lender would, and
 * the later lines are worked from the rounded figure so the arithmetic on screen checks out.
 */
export function loanSteps(n: LoanNumbers): Step[] {
  const monthly = round2(emi(n.principal, n.rate, n.months).emi);
  const total = round2(monthly * n.months);
  return [
    {
      label: 'Each month you pay',
      parts: [{ money: n.principal }, { op: `at ${n.rate}% a year, over` }, { count: n.months }, { op: 'months' }],
      result: { money: monthly },
    },
    { label: 'What that adds up to', parts: [{ money: monthly }, { op: '×' }, { count: n.months }], result: { money: total } },
    {
      label: 'What borrowing costs',
      parts: [{ money: total }, { op: '−' }, { money: n.principal }],
      result: { money: round2(total - n.principal) },
    },
  ];
}

/** "What does borrowing cost in total?", hidden among the slips people make with interest. */
export function loanChoices(n: LoanNumbers): Choice[] {
  if (n.rate <= 0) throw new Error('Practice numbers need a rate above 0, or borrowing costs nothing and there is no question to ask.');
  const [, total, cost] = loanSteps(n).map((step) => ('money' in step.result ? step.result.money : 0));
  const yearly = round2((n.principal * n.rate) / 100);
  const flat = round2(((n.principal * n.rate) / 100) * (n.months / 12));
  const candidates: Choice[] = [
    { value: { money: cost }, correct: true, why: 'Everything you pay back, minus what you borrowed. That gap is the whole cost of the loan.' },
    { value: { money: total }, correct: false, why: 'That is everything you pay back, including the money you borrowed. The cost is only the part above what you borrowed.' },
    {
      value: { money: flat },
      correct: false,
      why: 'That charges the rate on the full amount for the whole time. Each payment shrinks what you owe, so later months cost less interest.',
    },
    { value: { money: yearly }, correct: false, why: 'That is one year of interest on the full amount. The loan runs for its whole term, not one year.' },
  ];
  return dedupe(candidates).sort((a, b) => num(a) - num(b));
}

/** Saving every month: what you put in, what it becomes at the example rate, and the difference. */
export function growthSteps(n: GrowthNumbers): Step[] {
  const result = compoundGrowth(0, n.monthly, n.rate, n.years);
  const putIn = Math.round(result.totalContributed);
  const grows = Math.round(result.finalValue);
  return [
    { label: 'What you put in', parts: [{ money: n.monthly }, { op: '×' }, { count: n.years * 12 }, { op: 'months' }], result: { money: putIn } },
    {
      label: `What it grows to at ${n.rate}% a year`,
      parts: [{ money: putIn }, { op: `growing for` }, { count: n.years }, { op: n.years === 1 ? 'year' : 'years' }],
      result: { money: grows },
    },
    { label: 'Growth on top', parts: [{ money: grows }, { op: '−' }, { money: putIn }], result: { money: grows - putIn } },
  ];
}

/** "How much of that is growth?", beside the usual confusions of total, deposits and flat interest. */
export function growthChoices(n: GrowthNumbers): Choice[] {
  if (n.rate <= 0 || n.monthly <= 0) throw new Error('Practice numbers need a monthly amount and a rate above 0, or there is no growth to ask about.');
  const [put, grows, growth] = growthSteps(n).map((step) => ('money' in step.result ? step.result.money : 0));
  const flat = Math.round(put * (n.rate / 100) * n.years);
  const candidates: Choice[] = [
    { value: { money: growth }, correct: true, why: 'The final amount minus everything you put in yourself. What is left is what the growth added.' },
    { value: { money: grows }, correct: false, why: 'That is the whole amount at the end. Most of it is money you put in yourself.' },
    { value: { money: put }, correct: false, why: 'That is what you put in. Growth is only the part on top of it.' },
    {
      value: { money: flat },
      correct: false,
      why: 'That applies the rate to every deposit for every year. A deposit made last month has only grown for a month.',
    },
  ];
  return dedupe(candidates).sort((a, b) => num(a) - num(b));
}

function num(choice: Choice): number {
  return 'money' in choice.value ? choice.value.money : choice.value.count;
}

/** Two slips can land on the same number; keep the correct one, or the first. */
function dedupe(choices: Choice[]): Choice[] {
  const seen = new Map<number, Choice>();
  for (const choice of choices) {
    const key = num(choice);
    if (key <= 0) continue;
    const existing = seen.get(key);
    if (!existing || (choice.correct && !existing.correct)) seen.set(key, choice);
  }
  return [...seen.values()];
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
