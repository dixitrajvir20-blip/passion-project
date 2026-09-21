import { useState } from 'preact/hooks';
import { emi } from '../lib/finance';
import { localeByCode, money, number } from '../lib/format';
import './explorer.css';

interface Props {
  principal: number;
  rate: number;
  /** Repayment lengths to try, in months. */
  terms: number[];
  localeCode: string;
  prompts: string[];
  toolHref: string;
}

/**
 * One thing to change, the length of the loan, and a sentence that shows the trade: a longer loan
 * costs less each month and more in total. Server-rendered on the first term, so it reads with no JS.
 */
export default function LoanExplorer({ principal, rate, terms, localeCode, prompts, toolHref }: Props) {
  const [months, setMonths] = useState(terms[0]);
  const locale = localeByCode(localeCode);
  const cash = (v: number) => money(v, locale, 0);
  const r = emi(principal, rate, months);
  const query = new URLSearchParams({ principal: String(principal), rate: String(rate), months: String(months) });

  return (
    <div class="explorer">
      <p class="explorer-label" id="lx-label">Months to repay {cash(principal)} at {rate}% a year</p>
      <div class="explorer-presets" role="group" aria-labelledby="lx-label">
        {terms.map((t) => (
          <button type="button" class="preset" aria-pressed={t === months ? 'true' : 'false'} onClick={() => setMonths(t)}>
            {number(t, locale)}
          </button>
        ))}
      </div>
      <p class="explorer-figure">{cash(r.emi)} a month</p>
      <p class="explorer-says" role="status">
        {r.totalInterest > 0
          ? `Over ${number(months, locale)} months you pay back ${cash(r.totalPaid)}. The ${cash(r.totalInterest)} on top is what borrowing costs.`
          : `With no interest you pay back exactly ${cash(principal)}.`}
      </p>
      <ol class="explorer-prompts">
        {prompts.map((p) => <li>{p}</li>)}
      </ol>
      <p class="explorer-actions">
        <a class="btn btn-link" href={`${toolHref}?${query.toString()}`}>Open the loan calculator with these numbers</a>
      </p>
    </div>
  );
}
