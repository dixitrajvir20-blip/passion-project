/**
 * A loan's cost as a yearly rate: whatever the charge is called, what it comes to over a year,
 * worked out on what reaches you. The method (12 months, 365 days) comes from the edition's rules
 * in config, never from the currency picker, so there is no currency field: the edition's locale
 * is fixed. The Props interface is fixed by src/pages/[region]/tools/[tool].astro.
 */
import type { YearlyRateConfig } from '../lib/tools/yearly-rate';
import {
  FIRSTS,
  NOTHING_LENT_ERROR,
  PERIODS,
  amountText,
  basisFrom,
  compoundedText,
  errorText,
  isFirst,
  isPeriod,
  ledgerLines,
  noteText,
  readFigure,
  resultSentence,
  rowLabel,
  scheduleForTable,
  yearlyRate,
  yearlyText,
  type FieldKey,
} from '../lib/tools/yearly-rate';
import type { Edition } from '../lib/tools/types';
import { number, ratePercent } from '../lib/format';
import { Figure, HowItWorks, NumberField, Result, SelectField, ToolActions, useFields, useLocale } from './tool-kit';
import './tools.css';

interface Props {
  config: YearlyRateConfig;
  edition: Edition;
  localeCode: string;
  prefix: string;
}

const PERIOD_OPTIONS = [
  { value: 'week', label: '7 days, a week' },
  { value: 'month', label: 'A month' },
  { value: 'days', label: 'Another number of days' },
];

const FIRST_OPTIONS = [
  { value: 'later', label: 'One period after the money arrives' },
  { value: 'on-the-day', label: 'On the day the money arrives' },
];

/** A typed number, or null for blank or unreadable; one too large to hold reads as ±Infinity, keeping its sign. */
const read = readFigure;

export default function YearlyRate({ config, localeCode }: Props) {
  const { fields, set, reset } = useFields('yr', config.defaults, { allowed: { period: PERIODS, first: FIRSTS } });
  // Edition rules: the locale is the edition's, never a currency saved on another tool.
  const { locale } = useLocale(localeCode, { fixed: true });
  const basis = basisFrom(config.rules);

  const period = isPeriod(fields.period) ? fields.period : 'week';
  const first = isFirst(fields.first) ? fields.first : 'later';
  const count = read(fields.count);
  const days = period === 'days' ? read(fields.days) : null;

  const result = yearlyRate(
    { amount: read(fields.amount), fee: read(fields.fee), repayment: read(fields.repayment), count, period, days, first },
    basis,
  );

  const errors = result.kind === 'invalid' ? result.errors : {};
  const error = (key: FieldKey) => {
    const code = errors[key];
    return code ? errorText(key, code, locale) : undefined;
  };
  const countNote =
    result.notes.includes('count-floored') && count !== null ? noteText('count-floored', Math.floor(count), locale) : undefined;
  const daysNote = result.notes.includes('days-floored') && days !== null ? noteText('days-floored', Math.floor(days), locale) : undefined;

  const schedule = scheduleForTable(result);
  // The worked examples in How this is worked out, computed by the same maths as the reader's own.
  const kfs = yearlyRate({ amount: 20000, fee: 400, repayment: 969.73, count: 24, period: 'month', first: 'later' }, basis);
  const flat = yearlyRate({ amount: 20000, fee: 0, repayment: 1966.67, count: 12, period: 'month', first: 'later' }, basis);
  const kfsApr = config.rules.find((rule) => rule.key === 'kfsIllustrationApr')?.value;
  const m = (value: number) => amountText(value, locale);

  // The link carries the days only when they are read.
  const { days: _days, ...rest } = fields;
  const query = period === 'days' ? fields : rest;

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <NumberField
            id="yr-amount"
            label="Amount borrowed"
            hint="The loan amount on the offer, or the price of what you are buying in instalments."
            value={fields.amount}
            onInput={set('amount')}
            error={error('amount')}
          />
          <NumberField
            id="yr-fee"
            label="Fees and charges at the start"
            hint="Processing fees, insurance and other charges collected through the lender, with the GST you pay on them, and interest taken up front. A Key Facts Statement may list fees before GST; a card’s instalment plan lists them in its terms."
            value={fields.fee}
            onInput={set('fee')}
            error={error('fee')}
          />
          <NumberField
            id="yr-repayment"
            label="Each repayment"
            hint="The one payment, or each equal instalment. For a flat-rate offer, type the instalment printed on it."
            value={fields.repayment}
            onInput={set('repayment')}
            error={error('repayment')}
          />
          <NumberField
            id="yr-count"
            label="Number of repayments"
            hint="Every instalment, counting one paid on the day."
            value={fields.count}
            onInput={set('count')}
            note={countNote}
            error={error('count')}
            min="1"
            inputMode="numeric"
          />
          <SelectField
            id="yr-period"
            label="Length of each period"
            hint="For one repayment, the time until it is due. For instalments, the time from one to the next."
            value={period}
            options={PERIOD_OPTIONS}
            onChange={set('period')}
          />
          {period === 'days' && (
            <NumberField
              id="yr-days"
              label="Days in each period"
              hint="A year counts as 365 days, so 91 days is 365 ÷ 91 periods."
              value={fields.days}
              onInput={set('days')}
              note={daysNote}
              error={error('days')}
              min="1"
              inputMode="numeric"
            />
          )}
          <SelectField
            id="yr-first"
            label="First repayment"
            hint="Shop instalment plans often take the first part on the day. A Key Facts Statement shows when repayments start."
            value={first}
            options={FIRST_OPTIONS}
            onChange={set('first')}
            error={result.kind === 'nothing-lent' ? NOTHING_LENT_ERROR : undefined}
          />
          <ToolActions query={query} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it comes to</h2>
          <Figure label="a year, worked out from the figures above" value={yearlyText(result, locale)} />
          {ledgerLines(result, locale, basis).map((line) => (
            <Result label={line.label} value={line.value} op={line.op} subtotal={line.subtotal} main={line.main} note={line.note} />
          ))}
          <p class="notice">Rates are rounded for display; the yearly rate is the rate shown times the periods in a year.</p>
          <p class="plain yr-sentence" role="status">{resultSentence(result, locale)}</p>
          <p class="plain">A regulated loan’s Key Facts Statement prints its APR. Set this beside it.</p>
        </div>
      </div>

      <HowItWorks>
        <p>
          The rate is worked out on what reaches you: the amount borrowed minus the fees and charges taken at the start, and
          minus the first repayment if you said it is paid on the day. The cost of borrowing is everything you repay after
          that, minus what reached you.
        </p>
        <p>
          One repayment: the rate for the period is the cost divided by what reached you. {m(500)} on {m(5000)} is 10% for
          the 7 days.
        </p>
        <p>
          Instalments: each one pays the period’s charge on what is still owed, and the rest comes off. The tool finds the one
          rate per period at which your instalments pay off exactly what reached you; with more than one repayment, a table
          below shows it repayment by repayment. The first repayment is taken to fall one period after the money arrives, as on a Key Facts Statement’s
          line for when repayments start, unless you chose “on the day”. A lender’s own schedule uses its interest rate on
          the full loan, so its rows differ from these.
        </p>
        <p>
          The yearly rate is the rate for one period, as shown, times the periods in a year: {number(basis.monthsPerYear, locale)} for
          a month, or {number(basis.daysPerYear, locale)} ÷ the days in each period ({number(basis.daysPerYear, locale)} ÷ 7 for a
          week). Rates are rounded for display, and the yearly rate is worked out from the rate shown.
        </p>
        <p>
          For equal monthly instalments with the fees taken at the start, this follows the method in the Reserve Bank’s Key
          Facts Statement illustration: the rate at which the repayments are worth what reached you, times{' '}
          {number(basis.monthsPerYear, locale)}. There, {m(20000)} with {m(400)} of fees and 24 instalments of {m(970)} ({m(969.73)}{' '}
          before rounding) gives {kfsApr !== undefined ? ratePercent(kfsApr, locale, 2) : 'its APR'}; here, with {m(969.73)}, it
          shows {yearlyText(kfs, locale)}. The Reserve Bank’s illustration labels that line “Annual Percentage rate – Effective
          annualized interest rate”. If your result is not within rounding
          of the statement’s APR, check for a charge you have not typed, a different first repayment date, unequal
          instalments, or GST you added that the statement’s fee line leaves out.
        </p>
        <p>
          For loans counted in days, a lender may turn the rate into a yearly one day by day, so its APR can differ from this.
          On the 7-day loan here, a daily rate times 365 gives 500.4% instead of 521.4%.
        </p>
        <p>
          A flat rate is charged on the whole amount even as you repay it, so it is not a yearly rate: 18% flat on {m(20000)}{' '}
          over a year, 12 instalments of {m(1966.67)}, works out to {yearlyText(flat, locale)} a year here. Quick rules that roughly double a flat
          rate are only approximations; type the instalment printed on the offer.
        </p>
        {schedule.length > 0 && (
          <>
            <h3 id="yr-table-h">Repayment by repayment</h3>
            <div class="table-wrap" role="region" aria-labelledby="yr-table-h" tabIndex={0}>
              <table class="table numbers">
                <thead>
                  <tr>
                    <th scope="col">Repayment</th>
                    <th scope="col">Paid</th>
                    <th scope="col">Charge for the period</th>
                    <th scope="col">Paid off</th>
                    <th scope="col">Still owed</th>
                  </tr>
                </thead>
                <tbody>
                  {result.kind === 'rate' && result.onTheDay && (
                    <tr>
                      <th scope="row">On the day</th>
                      <td>{m(result.firstOnTheDay)}</td>
                      <td>{m(0)}</td>
                      <td>{m(result.firstOnTheDay)}</td>
                      <td>{m(result.received)}</td>
                    </tr>
                  )}
                  {schedule.map((row) => (
                    <tr>
                      <th scope="row">{rowLabel(row)}</th>
                      <td>{m(row.paid)}</td>
                      <td>{m(row.charge)}</td>
                      <td>{m(row.paidOff)}</td>
                      <td>{m(row.owed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {result.kind === 'rate' && result.later > 1 && !result.capped && schedule.length === 0 && (
          <p>At this rate over this many repayments, a table rounded to the paisa would not add up, so it is left out.</p>
        )}
        {result.kind === 'rate' && (
          <p>
            If the same charge is paid period after period, it compounds to {compoundedText(result, locale)} over a year. The
            headline does not use this figure.
          </p>
        )}
        <p>
          Not counted: late fees, bounce charges and anything else charged only if something goes wrong, as an APR leaves
          them out; tax added to each instalment, unless you add it to the repayment; unequal instalments, a large last
          payment and months with no payment. For those, use the APR on the Key Facts Statement. A card’s instalment plan
          has no Key Facts Statement; its charges are in the plan’s terms and on the statement.
        </p>
        <p>Nothing you type leaves this page. A copied link carries the numbers after the #, which browsers do not send to any server.</p>
      </HowItWorks>
    </div>
  );
}
