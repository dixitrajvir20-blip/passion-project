import { useState } from 'preact/hooks';
import { breakEven, type BreakEven } from '../lib/finance';
import { localeByCode, money, number } from '../lib/format';
import './explorer.css';

interface Props {
  fixed: number;
  variable: number;
  prices: number[];
  unitName: string;
  localeCode: string;
  prompts: string[];
  /** The full calculator, which reads these numbers from the query string. */
  toolHref: string;
  /** Opens on the worked example's price, so the reader meets the number they just saw. */
  initial?: number;
}

/**
 * One thing to change (the price) and one sentence that answers. The four-input calculator is a
 * different page: inside a lesson, free play from the first second teaches nothing. Buttons rather
 * than a slider, because a slider is imprecise on a 360px touch screen and close to invisible at
 * 200% zoom. Server-rendered with the first price worked out, so it reads correctly with no JS.
 * Every key says what it is ("₹1,500 per student"), the answer is one sentence that names the
 * price and the count, and after a tap a quieter line says what moved since the last price.
 */
export default function MarginExplorer({ fixed, variable, prices, unitName, localeCode, prompts, toolHref, initial }: Props) {
  const [price, setPrice] = useState(initial !== undefined && prices.includes(initial) ? initial : prices[0]);
  const [previous, setPrevious] = useState<number | null>(null);
  const locale = localeByCode(localeCode);
  const cash = (value: number) => money(value, locale, Number.isInteger(value) ? 0 : 2);
  const one = unitName.replace(/s$/, '');
  const count = (n: number) => `${number(n, locale)} ${n === 1 ? one : unitName}`;
  const result = breakEven(fixed, variable, price);
  const before = previous === null ? null : breakEven(fixed, variable, previous);

  const pick = (value: number) => {
    if (value === price) return;
    setPrevious(price);
    setPrice(value);
  };

  const query = new URLSearchParams({
    fixed: String(fixed),
    variable: String(variable),
    price: String(price),
    units: String(result.viable ? result.units! + 50 : 100),
  });

  return (
    <div class="explorer">
      <p class="explorer-label" id="mx-label">Price per {one}</p>
      <div class="explorer-presets" role="group" aria-labelledby="mx-label">
        {prices.map((p) => (
          <button type="button" class="preset" aria-pressed={p === price ? 'true' : 'false'} onClick={() => pick(p)}>
            {cash(p)} <span class="preset-unit">per {one}</span>
          </button>
        ))}
      </div>

      <p class={`explorer-figure ${result.viable ? '' : 'is-loss'}`}>
        {result.viable ? `${number(result.units!, locale)} ${unitName}` : 'Never'}
      </p>
      <p class="explorer-says explorer-result" role="status">
        {result.viable
          ? `At ${cash(price)} per ${one}, each ${one} leaves ${cash(result.contributionMargin)}, so the month needs ${count(result.units!)} to cover ${cash(fixed)}.`
          : `At ${cash(price)} per ${one}, each ${one} costs ${cash(variable)} to make, so nothing is left to pay the monthly costs. Selling more only loses more.`}
      </p>
      {before && previous !== null && <p class="explorer-change">{sinceLast(result, before, cash(previous), unitName, one, locale)}</p>}

      <ol class="explorer-prompts">
        {prompts.map((prompt) => <li>{prompt}</li>)}
      </ol>
      <p class="explorer-actions">
        <a class="btn btn-link" href={`${toolHref}?${query.toString()}`}>Open the full calculator with these numbers</a>
      </p>
    </div>
  );
}

/** The difference from the last price, in the unit the reader counts in. Reports; never judges. */
function sinceLast(now: BreakEven, was: BreakEven, wasPrice: string, unitName: string, one: string, locale: ReturnType<typeof localeByCode>): string {
  if (now.viable && was.viable) {
    const d = now.units! - was.units!;
    if (d === 0) return `That is the same count as at ${wasPrice}.`;
    const n = Math.abs(d);
    return `That is ${number(n, locale)} ${d > 0 ? 'more' : 'fewer'} ${n === 1 ? one : unitName} than at ${wasPrice}.`;
  }
  if (now.viable) return `At ${wasPrice} no number of ${unitName} covered the month; this price needs ${number(now.units!, locale)}.`;
  if (was.viable) return `At ${wasPrice} the month needed ${number(was.units!, locale)} ${unitName}; at this price no number of them covers it.`;
  return `Neither this price nor ${wasPrice} leaves anything from a sale.`;
}
