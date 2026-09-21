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
 * time and habit, and no rate is promised.
 */
export default function GrowthExplorer({ amounts, rate, horizons, localeCode, prompts, toolHref }: Props) {
  const [monthly, setMonthly] = useState(amounts[0]);
  const [years, setYears] = useState(horizons[0]);
  const locale = localeByCode(localeCode);
  const cash = (v: number) => money(Math.round(v), locale);
  const r = compoundGrowth(0, monthly, rate, years);
  const query = new URLSearchParams({ start: '0', monthly: String(monthly), rate: String(rate), years: String(years) });

  return (
    <div class="explorer">
      <p class="explorer-label" id="gx-amount">Each month</p>
      <div class="explorer-presets" role="group" aria-labelledby="gx-amount">
        {amounts.map((a) => (
          <button type="button" class="preset" aria-pressed={a === monthly ? 'true' : 'false'} onClick={() => setMonthly(a)}>
            {cash(a)}
          </button>
        ))}
      </div>
      <p class="explorer-label" id="gx-years">For how many years</p>
      <div class="explorer-presets" role="group" aria-labelledby="gx-years">
        {horizons.map((y) => (
          <button type="button" class="preset" aria-pressed={y === years ? 'true' : 'false'} onClick={() => setYears(y)}>
            {number(y, locale)}
          </button>
        ))}
      </div>
      <p class="explorer-figure">{cash(r.finalValue)}</p>
      <p class="explorer-says" role="status">
        You put in {cash(r.totalContributed)} yourself. The other {cash(r.growth)} is growth at an example rate of {rate}% a
        year, which nobody can promise.
      </p>
      <ol class="explorer-prompts">
        {prompts.map((p) => <li>{p}</li>)}
      </ol>
      <p class="explorer-actions">
        <a class="btn btn-link" href={`${toolHref}?${query.toString()}`}>Open the savings calculator with these numbers</a>
      </p>
    </div>
  );
}
