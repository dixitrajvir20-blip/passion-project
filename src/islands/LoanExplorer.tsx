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
 * Each key is a term with its length in years beside it ("36 months (3 years)"); after a tap, a
 * quieter line says how the payment and the interest moved against the last term.
 */
export default function LoanExplorer({ principal, rate, terms, localeCode, prompts, toolHref }: Props) {
  const [months, setMonths] = useState(terms[0]);
  const [previous, setPrevious] = useState<number | null>(null);
  const locale = localeByCode(localeCode);
  const cash = (v: number) => money(v, locale, 0);
  // Whole units, as the figures are printed, so the change line agrees with what is on screen.
  const shown = (m: number) => {
    const r = emi(principal, rate, m);
    return { emi: Math.round(r.emi), paid: Math.round(r.totalPaid), interest: Math.round(r.totalInterest) };
  };
  const r = shown(months);
  const before = previous === null ? null : shown(previous);
  const inYears = (m: number): string | null => {
    const years = m / 12;
    if (m % 12 === 0) return `${number(years, locale)} ${years === 1 ? 'year' : 'years'}`;
    return m > 12 ? `${number(years, locale, 1)} years` : null;
  };
  const query = new URLSearchParams({ principal: String(principal), rate: String(rate), months: String(months) });

  const pick = (value: number) => {
    if (value === months) return;
    setPrevious(months);
    setMonths(value);
  };

  return (
    <div class="explorer">
      <p class="explorer-label" id="lx-label">Months to repay {cash(principal)} at {rate}% a year</p>
      <div class="explorer-presets" role="group" aria-labelledby="lx-label">
        {terms.map((t) => {
          const years = inYears(t);
          return (
            <button type="button" class="preset" aria-pressed={t === months ? 'true' : 'false'} onClick={() => pick(t)}>
              {number(t, locale)} months {years && <span class="preset-unit">({years})</span>}
            </button>
          );
        })}
      </div>
      <p class="explorer-figure">{cash(r.emi)} a month</p>
      <p class="explorer-says explorer-result" role="status">
        {r.interest > 0
          ? `Over ${number(months, locale)} months the payment is ${cash(r.emi)} a month and the interest comes to ${cash(r.interest)}.`
          : `Over ${number(months, locale)} months the payment is ${cash(r.emi)} a month, and with no interest you pay back exactly ${cash(principal)}.`}
      </p>
      {before && previous !== null && (
        <p class="explorer-change">
          {sinceLast(r, before, number(previous, locale), cash)}
        </p>
      )}
      <ol class="explorer-prompts">
        {prompts.map((p) => <li>{p}</li>)}
      </ol>
      <p class="explorer-actions">
        <a class="btn btn-link" href={`${toolHref}?${query.toString()}`}>Open the loan calculator with these numbers</a>
      </p>
    </div>
  );
}

type Shown = { emi: number; paid: number; interest: number };

/** "₹1,204 a month less than over 24 months, and ₹8,250 more interest." Reports; never judges. */
function sinceLast(now: Shown, was: Shown, wasMonths: string, cash: (v: number) => string): string {
  const dEmi = now.emi - was.emi;
  const payment = dEmi === 0 ? `The same payment a month as over ${wasMonths} months` : `${cash(Math.abs(dEmi))} a month ${dEmi < 0 ? 'less' : 'more'} than over ${wasMonths} months`;
  const dInt = now.interest - was.interest;
  const interest =
    now.interest === 0 && was.interest === 0
      ? 'no interest either way'
      : dInt === 0
        ? 'the same interest'
        : `${cash(Math.abs(dInt))} ${dInt > 0 ? 'more' : 'less'} interest`;
  return `${payment}, and ${interest}.`;
}
