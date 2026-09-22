import { useState } from 'preact/hooks';
import { localeByCode, money } from '../lib/format';
import { encodeRows, type BudgetKind } from '../lib/budget-link';
import './explorer.css';

interface Line {
  label: string;
  percent: number;
  hint?: string;
}

interface Props {
  incomes: number[];
  lines: Line[];
  localeCode: string;
  prompts: string[];
  /** The full budget planner; it opens with this split filled in. */
  toolHref?: string;
}

const STEP = 5;

/** What the reader last changed, so the change line can name it. */
type Lever = { kind: 'income'; from: number } | { kind: 'share'; index: number; from: number };

/**
 * Move money between a few lines and watch what is left. The copy reports; it never judges.
 * A budgeting sim that comments on choices ("too much on wants") measurably backfires, so the
 * only thing this ever says is what the numbers are. Any split here is a starting point, which
 * is why every line can be changed. The step is stated on the button ("+5%"), the answer names
 * the total the lines add up to, and after a change a quieter line says what moved.
 */
export default function SplitExplorer({ incomes, lines, localeCode, prompts, toolHref }: Props) {
  const [income, setIncome] = useState(incomes[Math.min(1, incomes.length - 1)]);
  const [shares, setShares] = useState(lines.map((line) => line.percent));
  const [previous, setPrevious] = useState<{ income: number; shares: number[]; lever: Lever } | null>(null);
  const locale = localeByCode(localeCode);
  const cash = (value: number) => money(Math.round(value), locale);

  const now = tally(income, shares);
  const before = previous === null ? null : tally(previous.income, previous.shares);

  const pickIncome = (amount: number) => {
    if (amount === income) return;
    setPrevious({ income, shares, lever: { kind: 'income', from: income } });
    setIncome(amount);
  };
  const nudge = (index: number, by: number) => {
    const next = Math.max(0, Math.min(100, shares[index] + by));
    if (next === shares[index]) return;
    setPrevious({ income, shares, lever: { kind: 'share', index, from: shares[index] } });
    setShares(shares.map((share, i) => (i === index ? next : share)));
  };

  return (
    <div class="explorer">
      <p class="explorer-label" id="sx-label">What came in this month</p>
      <div class="explorer-presets" role="group" aria-labelledby="sx-label">
        {incomes.map((amount) => (
          <button type="button" class="preset" aria-pressed={amount === income ? 'true' : 'false'} onClick={() => pickIncome(amount)}>
            {cash(amount)}
          </button>
        ))}
      </div>

      <ul class="split-rows">
        {lines.map((line, index) => (
          <li class="split-row">
            <span class="split-name">{line.label}</span>
            <span class="split-amount">{cash(now.amounts[index])}</span>
            {line.hint && <span class="split-hint">{line.hint}</span>}
            <span class="split-step">
              <button type="button" aria-label={`−${STEP}% for ${line.label}`} onClick={() => nudge(index, -STEP)}>−{STEP}%</button>
              <output aria-label={`${line.label} share`}>{shares[index]}%</output>
              <button type="button" aria-label={`+${STEP}% for ${line.label}`} onClick={() => nudge(index, STEP)}>+{STEP}%</button>
            </span>
          </li>
        ))}
      </ul>

      <p class="explorer-says explorer-result" role="status">
        {now.left > 0 && (
          <>
            The lines add up to {cash(now.assigned)}, so <span data-left="">{cash(now.left)}</span> of the {cash(income)} is not given a job yet.
          </>
        )}
        {now.left === 0 && (
          <>
            Every {unit(locale.currency)} has a job: the lines add up to {cash(income)}, with <span data-left="">{cash(0)}</span> left over.
          </>
        )}
        {now.left < 0 && (
          <>
            The lines add up to {cash(now.assigned)}, which is {cash(-now.left)} more than came in, so one line has to come down.
          </>
        )}
      </p>
      {before && previous !== null && (
        <p class="explorer-change">{sinceLast(previous.lever, before, now, income, lines, cash)}</p>
      )}

      <ol class="explorer-prompts">
        {prompts.map((prompt) => <li>{prompt}</li>)}
      </ol>
      {toolHref && (
        <p class="explorer-actions">
          <a class="btn btn-link" href={`${toolHref}?${handoff(income, lines, shares)}`}>Open the budget planner with this split</a>
        </p>
      )}
    </div>
  );
}

interface Tally {
  amounts: number[];
  assigned: number;
  left: number;
}

/**
 * Round each line first, then take what is left from the rounded rows. Deriving the leftover
 * from the unrounded percentages instead lets the rows and the leftover disagree by a rupee.
 */
function tally(income: number, shares: number[]): Tally {
  const amounts = shares.map((share) => Math.round((income * share) / 100));
  const assigned = amounts.reduce((sum, amount) => sum + amount, 0);
  return { amounts, assigned, left: income - assigned };
}

/** Names the lever that moved and what it did to the leftover. Reports; never judges. */
function sinceLast(lever: Lever, was: Tally, now: Tally, income: number, lines: Line[], cash: (v: number) => string): string {
  let head: string;
  if (lever.kind === 'income') {
    const d = income - lever.from;
    head = `${cash(Math.abs(d))} ${d > 0 ? 'more' : 'less'} coming in than at ${cash(lever.from)}`;
  } else {
    const d = now.amounts[lever.index] - was.amounts[lever.index];
    const label = lines[lever.index].label;
    head = d === 0 ? `the same amount for ${label} as at ${lever.from}%` : `${cash(Math.abs(d))} ${d > 0 ? 'more' : 'less'} for ${label} than at ${lever.from}%`;
  }
  return `That is ${head}, ${leftover(was.left, now.left, cash)}.`;
}

function leftover(was: number, is: number, cash: (v: number) => string): string {
  const d = is - was;
  if (was >= 0 && is >= 0) {
    return d === 0 ? `and the same ${cash(is)} is left without a job` : `and ${cash(Math.abs(d))} ${d > 0 ? 'more' : 'less'} is left without a job`;
  }
  if (was < 0 && is < 0) {
    return d === 0 ? `and the plan is still ${cash(-is)} more than came in` : `and the plan is ${cash(Math.abs(d))} ${d < 0 ? 'further' : 'less'} over what came in`;
  }
  if (is < 0) return `and the plan is now ${cash(-is)} more than came in`;
  return is === 0 ? 'and every line now fits what came in exactly' : `and ${cash(is)} is now left without a job`;
}

/** Money given at home counts as a need in the planner, which has three kinds, not four. */
function kindOf(label: string): BudgetKind {
  const l = label.toLowerCase();
  return l.includes('saving') ? 'savings' : l.includes('want') ? 'wants' : 'needs';
}

function handoff(income: number, lines: Line[], shares: number[]): string {
  const rows = lines.map((line, i) => ({
    name: line.label,
    amount: String(Math.round((income * shares[i]) / 100)), // same rounding as the rows above
    category: kindOf(line.label),
  }));
  return new URLSearchParams({ income: String(income), rows: encodeRows(rows) }).toString();
}

function unit(currency: string): string {
  return { INR: 'rupee', USD: 'dollar', EUR: 'euro', GBP: 'pound', BRL: 'real', NGN: 'naira' }[currency] ?? 'unit';
}
