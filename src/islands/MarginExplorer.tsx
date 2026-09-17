import { useState } from 'preact/hooks';
import { breakEven } from '../lib/finance';
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
}

/**
 * One thing to change (the price) and one sentence that answers. The four-input calculator is a
 * different page: inside a lesson, free play from the first second teaches nothing. Buttons rather
 * than a slider, because a slider is imprecise on a 360px touch screen and close to invisible at
 * 200% zoom. Server-rendered with the first price worked out, so it reads correctly with no JS.
 */
export default function MarginExplorer({ fixed, variable, prices, unitName, localeCode, prompts, toolHref }: Props) {
  const [price, setPrice] = useState(prices[Math.min(1, prices.length - 1)]);
  const locale = localeByCode(localeCode);
  const cash = (value: number) => money(value, locale, Number.isInteger(value) ? 0 : 2);
  const one = unitName.replace(/s$/, '');
  const result = breakEven(fixed, variable, price);

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
          <button type="button" class="preset" aria-pressed={p === price ? 'true' : 'false'} onClick={() => setPrice(p)}>
            {cash(p)}
          </button>
        ))}
      </div>

      <p class={`explorer-figure ${result.viable ? '' : 'is-loss'}`}>
        {result.viable ? `${number(result.units!, locale)} ${unitName}` : 'Never'}
      </p>
      <p class="explorer-says" role="status">
        {result.viable
          ? `At ${cash(price)} you keep ${cash(result.contributionMargin)} from each ${one}, so ${cash(fixed)} of monthly costs is covered once you have sold ${number(result.units!, locale)}.`
          : `At ${cash(price)} each ${one} costs ${cash(variable)} to make, so nothing is left to pay the monthly costs. Selling more only loses more.`}
      </p>

      <ol class="explorer-prompts">
        {prompts.map((prompt) => <li>{prompt}</li>)}
      </ol>
      <p class="explorer-actions">
        <a class="btn btn-link" href={`${toolHref}?${query.toString()}`}>Open the full calculator with these numbers</a>
      </p>
    </div>
  );
}
