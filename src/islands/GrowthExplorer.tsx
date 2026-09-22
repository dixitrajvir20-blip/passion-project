import { useState } from 'preact/hooks';
import { compoundGrowth } from '../lib/finance';
import { localeByCode, money, number } from '../lib/format';
import './explorer.css';

interface Props {
  amounts: number[];
  rate: number;
  /** Horizons to try, in years. */
  horizons: number[];
  localeCode: string;
  prompts: string[];
  toolHref: string;
}

/**
 * Two things to change, how much each month and for how long, and a sentence that keeps what you
 * put in apart from what grew. The rate is fixed and labelled an example: the lesson is about
 * time and habit, and no rate is promised. Keys say what they are ("₹2,000 a month", "10 years");
 * after a tap a quieter line says how the total moved against the last amount or horizon.
 */
export default function GrowthExplorer({ amounts, rate, horizons, localeCode, prompts, toolHref }: Props) {
  const [monthly, setMonthly] = useState(amounts[0]);
  const [years, setYears] = useState(horizons[0]);
  const [previous, setPrevious] = useState<{ monthly: number; years: number } | null>(null);
  const locale = localeByCode(localeCode);
  const cash = (v: number) => money(Math.round(v), locale);
  // Whole units, and growth as the gap between the two printed figures, so the sentence adds up.
  const shown = (m: number, y: number) => {
    const g = compoundGrowth(0, m, rate, y);
    const final = Math.round(g.finalValue);
    const put = Math.round(g.totalContributed);
    return { final, put, growth: final - put };
  };
  const r = shown(monthly, years);
  const before = previous === null ? null : shown(previous.monthly, previous.years);
  const horizon = (y: number) => (y === 1 ? '12 months' : `${number(y, locale)} years`);
  const query = new URLSearchParams({ start: '0', monthly: String(monthly), rate: String(rate), years: String(years) });

  const pickMonthly = (value: number) => {
    if (value === monthly) return;
    setPrevious({ monthly, years });
    setMonthly(value);
  };
  const pickYears = (value: number) => {
    if (value === years) return;
    setPrevious({ monthly, years });
    setYears(value);
  };

  return (
    <div class="explorer">
      <p class="explorer-label" id="gx-amount">Each month</p>
      <div class="explorer-presets" role="group" aria-labelledby="gx-amount">
        {amounts.map((a) => (
          <button type="button" class="preset" aria-pressed={a === monthly ? 'true' : 'false'} onClick={() => pickMonthly(a)}>
            {cash(a)} <span class="preset-unit">a month</span>
          </button>
        ))}
      </div>
      <p class="explorer-label" id="gx-years">For how many years</p>
      <div class="explorer-presets" role="group" aria-labelledby="gx-years">
        {horizons.map((y) => (
          <button type="button" class="preset" aria-pressed={y === years ? 'true' : 'false'} onClick={() => pickYears(y)}>
            {number(y, locale)} {y === 1 ? 'year' : 'years'}
          </button>
        ))}
      </div>
      <p class="explorer-figure">{cash(r.final)}</p>
      <p class="explorer-says explorer-result" role="status">
        {cash(monthly)} a month at an example {rate}% a year grows to {cash(r.final)} in {horizon(years)}. Of that, {cash(r.put)} is
        what you put in and {cash(r.growth)} is growth, which nobody can promise.
      </p>
      {before && previous !== null && (
        <p class="explorer-change">
          {sinceLast(r, before, previous.monthly === monthly ? `over ${horizon(previous.years)}` : `at ${cash(previous.monthly)} a month`, cash)}
        </p>
      )}
      <ol class="explorer-prompts">
        {prompts.map((p) => <li>{p}</li>)}
      </ol>
      <p class="explorer-actions">
        <a class="btn btn-link" href={`${toolHref}?${query.toString()}`}>Open the savings calculator with these numbers</a>
      </p>
    </div>
  );
}

type Shown = { final: number; put: number; growth: number };

/** "That is ₹12,350 more than at ₹1,000 a month, and ₹350 more of it is growth." Reports; never judges. */
function sinceLast(now: Shown, was: Shown, than: string, cash: (v: number) => string): string {
  const dFinal = now.final - was.final;
  const total = dFinal === 0 ? `That is the same total as ${than}` : `That is ${cash(Math.abs(dFinal))} ${dFinal > 0 ? 'more' : 'less'} than ${than}`;
  const dGrowth = now.growth - was.growth;
  const growth = dGrowth === 0 ? 'with no change in growth' : `and ${cash(Math.abs(dGrowth))} ${dGrowth > 0 ? 'more' : 'less'} of it is growth`;
  return `${total}, ${growth}.`;
}
