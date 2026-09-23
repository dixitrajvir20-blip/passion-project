import { amortization, emi } from '../lib/finance';
import { money, number, percent } from '../lib/format';
import { CurrencyField, HowItWorks, Figure, NumberField, Result, ToolActions, toNumber, useFields, useLocale } from './tool-kit';
import './tools.css';

interface Props {
  defaults: { principal: string; rate: string; months: string };
  localeCode: string;
}

export default function LoanEmi({ defaults, localeCode }: Props) {
  const { fields, set, reset } = useFields('loan', defaults);
  const { locale, code, choose } = useLocale(localeCode);

  const principal = toNumber(fields.principal);
  const rate = toNumber(fields.rate);
  const months = Math.floor(toNumber(fields.months));

  const usable = principal > 0 && months > 0;
  const result = emi(principal, rate, months);
  const schedule = usable ? amortization(principal, rate, months) : [];

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <CurrencyField id="loan-currency" code={code} onChoose={choose} />
          <NumberField id="loan-principal" label="Amount borrowed" value={fields.principal} onInput={set('principal')} />
          <NumberField
            id="loan-rate"
            label="Interest rate, % a year"
            hint="The yearly rate on the offer. Type 0 to see the loan with no interest at all."
            value={fields.rate}
            onInput={set('rate')}
          />
          <NumberField
            id="loan-months"
            label="Months to repay"
            hint="Two years is 24. Ten years is 120."
            value={fields.months}
            onInput={set('months')}
            min="1"
            error={months > 0 ? undefined : 'Enter how many months you would take to repay, at least 1.'}
          />
          <ToolActions query={fields} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it means</h2>
          <Figure label="you pay each month" value={usable ? money(result.emi, locale) : '—'} />
          <Result label="You borrow" value={money(principal, locale)} />
          <Result label="Interest over the whole loan" value={usable ? money(result.totalInterest, locale) : '—'} />
          <Result main label="Total you pay back" value={usable ? money(result.totalPaid, locale) : '—'} />

          <p class="plain" role="status">
            {usable
              ? result.totalInterest > 0
                ? `You borrow ${money(principal, locale)} and pay back ${money(result.totalPaid, locale)}. The ${money(result.totalInterest, locale)} difference is the price of borrowing: ${percent(result.totalInterest / principal, locale, 0)} on top of what you borrowed.`
                : `With no interest you pay back exactly the ${money(principal, locale)} you borrowed, in ${number(months, locale)} equal parts.`
              : 'Enter an amount and a number of months to see what this loan costs.'}
          </p>
        </div>
      </div>

      {schedule.length > 0 && (
        <details class="how">
          <summary>Year by year</summary>
          <p>Early payments are mostly interest, because that is when you owe the most. Later ones mostly pay off the loan itself.</p>
          {/* Figures never break, so a large loan's table can scroll sideways in its wrap: the wrap is
              a named, focusable region so a keyboard can scroll it too (WCAG 2.1.1). */}
          <div class="table-wrap" role="region" aria-label="Year by year" tabIndex={0}>
            <table class="table numbers">
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col">Paid that year</th>
                  <th scope="col">Of which interest</th>
                  <th scope="col">Still owed</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr>
                    <th scope="row">{row.year}</th>
                    <td>{money(row.paid, locale)}</td>
                    <td>{money(row.interest, locale)}</td>
                    <td>{money(row.balance, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <HowItWorks>
        <p>Lenders work out one fixed monthly payment that clears the loan and its interest by the last month:</p>
        <p class="formula numbers">payment = P × r × (1 + r)<sup>n</sup> ÷ ((1 + r)<sup>n</sup> − 1)</p>
        <p>
          P is the amount borrowed, r is the yearly rate divided by 12, and n is the number of months.
          A longer loan makes each payment smaller and the total larger, because interest is charged
          for longer. Try doubling the months and watch both numbers.
        </p>
      </HowItWorks>
    </div>
  );
}
