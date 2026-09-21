import { useState } from 'preact/hooks';
import { deductions } from '../lib/finance';
import { localeByCode, money } from '../lib/format';
import './explorer.css';

interface Line {
  label: string;
  amount?: number;
  percentOfStart?: number;
  subtotalLabel?: string;
}

interface Props {
  starts: number[];
  startLabel: string;
  lines: Line[];
  endLabel: string;
  prompts: string[];
  localeCode: string;
}

/**
 * The lesson's own payslip (or payout, or award) with a different starting figure: tap a CTC, a
 * gross, a price, and watch every line and the answer move. A line is either a fixed amount or a
 * share of the start, so the arithmetic is the lesson's arithmetic. The result is said in one
 * sentence, and the change from the last tap in another.
 */
export default function DeductionExplorer({ starts, startLabel, lines, endLabel, prompts, localeCode }: Props) {
  const initial = starts[Math.min(1, starts.length - 1)];
  const [start, setStart] = useState(initial);
  const [previous, setPrevious] = useState<number | null>(null);
  const locale = localeByCode(localeCode);
  const cash = (value: number) => money(value, locale, Number.isInteger(value) ? 0 : 2);

  const amounts = (from: number) =>
    lines.map((line) => ({ label: line.label, amount: line.percentOfStart !== undefined ? Math.round((from * line.percentOfStart) / 100) : (line.amount ?? 0) }));
  const result = deductions(start, amounts(start));
  const before = previous === null ? null : deductions(previous, amounts(previous));
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

  const pick = (value: number) => {
    if (value === start) return;
    setPrevious(start);
    setStart(value);
  };

  return (
    <div class="explorer">
      <p class="explorer-label" id="dx-label">{startLabel}</p>
      <div class="explorer-presets" role="group" aria-labelledby="dx-label">
        {starts.map((value) => (
          <button type="button" class="preset" aria-pressed={value === start ? 'true' : 'false'} onClick={() => pick(value)}>
            {cash(value)}
          </button>
        ))}
      </div>

      <p class="explorer-says explorer-result" role="status">
        At a {lower(startLabel)} of {cash(start)}, {cash(result.deducted)} comes off and the {lower(endLabel)} is {cash(result.net)}.
      </p>
      {before && previous !== null && (
        <p class="explorer-change">
          {previous < start ? `${cash(start - previous)} more ${lower(startLabel)}` : `${cash(previous - start)} less ${lower(startLabel)}`}, and{' '}
          {result.net >= before.net ? `${cash(result.net - before.net)} more` : `${cash(before.net - result.net)} less`} {lower(endLabel)} than at {cash(previous)}.
        </p>
      )}

      <ol class="ledger">
        {amounts(start).map((line, index) => (
          <li class={`ledger-row${index === lines.length - 1 ? ' ledger-total' : ''}`}>
            <span class="ledger-label">{index === 0 ? startLabel : lines[index - 1].subtotalLabel ?? 'Left'} minus {lower(line.label)}</span>
            <strong class="ledger-figure numbers">{cash(result.running[index])}</strong>
          </li>
        ))}
      </ol>

      <ol class="explorer-prompts">
        {prompts.map((prompt) => <li>{prompt}</li>)}
      </ol>
    </div>
  );
}
