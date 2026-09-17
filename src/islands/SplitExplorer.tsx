import { useState } from 'preact/hooks';
import { localeByCode, money } from '../lib/format';
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
}

const STEP = 5;

/**
 * Move money between a few lines and watch what is left. The copy reports; it never judges.
 * A budgeting sim that comments on choices ("too much on wants") measurably backfires, so the
 * only thing this ever says is what the numbers are. Any split here is a starting point, which
 * is why every line can be changed.
 */
export default function SplitExplorer({ incomes, lines, localeCode, prompts }: Props) {
  const [income, setIncome] = useState(incomes[Math.min(1, incomes.length - 1)]);
  const [shares, setShares] = useState(lines.map((line) => line.percent));
  const locale = localeByCode(localeCode);
  const cash = (value: number) => money(Math.round(value), locale);

  const total = shares.reduce((sum, share) => sum + share, 0);
  const left = Math.round((income * (100 - total)) / 100);

  const nudge = (index: number, by: number) =>
    setShares(shares.map((share, i) => (i === index ? Math.max(0, Math.min(100, share + by)) : share)));

  return (
    <div class="explorer">
      <p class="explorer-label" id="sx-label">What came in this month</p>
      <div class="explorer-presets" role="group" aria-labelledby="sx-label">
        {incomes.map((amount) => (
          <button type="button" class="preset" aria-pressed={amount === income ? 'true' : 'false'} onClick={() => setIncome(amount)}>
            {cash(amount)}
          </button>
        ))}
      </div>

      <ul class="split-rows">
        {lines.map((line, index) => (
          <li class="split-row">
            <span class="split-name">{line.label}</span>
            <span class="split-amount">{cash((income * shares[index]) / 100)}</span>
            {line.hint && <span class="split-hint">{line.hint}</span>}
            <span class="split-step">
              <button type="button" aria-label={`Less for ${line.label}`} onClick={() => nudge(index, -STEP)}>−</button>
              <output aria-label={`${line.label} share`}>{shares[index]}%</output>
              <button type="button" aria-label={`More for ${line.label}`} onClick={() => nudge(index, STEP)}>+</button>
            </span>
          </li>
        ))}
      </ul>

      <p class="explorer-says" role="status">
        {left > 0 && `${cash(left)} is not given a job yet.`}
        {left === 0 && `Every ${unit(locale.currency)} has a job.`}
        {left < 0 && `This plan is ${cash(-left)} more than came in, so one line has to come down.`}
      </p>

      <ol class="explorer-prompts">
        {prompts.map((prompt) => <li>{prompt}</li>)}
      </ol>
    </div>
  );
}

function unit(currency: string): string {
  return { INR: 'rupee', USD: 'dollar', EUR: 'euro', GBP: 'pound', BRL: 'real', NGN: 'naira' }[currency] ?? 'unit';
}
