/**
 * Worked examples and practice steps, computed at build time from the same tested functions the
 * calculators use. A lesson passes numbers; it never types out arithmetic. One slip in a worked
 * example teaches the wrong procedure, and no amount of source-checking would catch it.
 */
import { breakEven } from './finance';

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

export interface Step {
  label: string;
  /** Left-hand side of the calculation, as amounts and operators. */
  parts: ({ money: number } | { count: number } | { op: string })[];
  result: { money: number } | { count: number };
  note?: string;
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
