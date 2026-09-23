import { compoundGrowth } from '../lib/finance';
import { money, number } from '../lib/format';
import { CurrencyField, HowItWorks, NumberField, Result, ToolActions, toNumber, useFields, useLocale } from './tool-kit';
import './tools.css';

interface Props {
  defaults: { start: string; monthly: string; rate: string; years: string };
  localeCode: string;
}

const W = 320;
const H = 190;
const PAD = { left: 4, right: 4, top: 34, bottom: 22 };
const MAX_YEARS = 50;

export default function CompoundGrowth({ defaults, localeCode }: Props) {
  const { fields, set, reset } = useFields('sg', defaults);
  const { locale, code, choose } = useLocale(localeCode);

  const start = toNumber(fields.start);
  const monthly = toNumber(fields.monthly);
  const rate = toNumber(fields.rate);
  const years = Math.min(MAX_YEARS, Math.max(0, Math.floor(toNumber(fields.years))));
  const result = compoundGrowth(start, monthly, rate, years);

  // Year 0 is today, so both lines start from what is already there.
  const points = [{ year: 0, contributed: start, balance: start }, ...result.years];
  const top = Math.max(1, ...points.map((p) => Math.max(p.balance, p.contributed)));
  const x = (year: number) => PAD.left + (years === 0 ? 0 : (year / years) * (W - PAD.left - PAD.right));
  const y = (value: number) => H - PAD.bottom - (value / top) * (H - PAD.top - PAD.bottom);
  const line = (key: 'balance' | 'contributed') => points.map((p) => `${x(p.year).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <CurrencyField id="sg-currency" code={code} onChoose={choose} />
          <NumberField id="sg-start" label="What you already have" value={fields.start} onInput={set('start')} />
          <NumberField id="sg-monthly" label="Added every month" value={fields.monthly} onInput={set('monthly')} />
          <NumberField
            id="sg-rate"
            label="Yearly rate, %"
            hint="An example for you to change, not a forecast. Rates move, and none is guaranteed."
            value={fields.rate}
            onInput={set('rate')}
          />
          <NumberField
            id="sg-years"
            label="Years"
            value={fields.years}
            onInput={set('years')}
            max={String(MAX_YEARS)}
            error={toNumber(fields.years) > MAX_YEARS ? `This shows up to ${MAX_YEARS} years.` : undefined}
          />
          <ToolActions query={fields} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it means</h2>
          <Result label="You put in" value={money(result.totalContributed, locale)} />
          <Result label="Growth on top" value={money(result.growth, locale)} />
          <Result main label={`After ${number(years, locale)} ${years === 1 ? 'year' : 'years'}`} value={money(result.finalValue, locale)} />

          <p class="plain" role="status">
            {years === 0
              ? 'Add a number of years to see the growth.'
              : result.growth > 0
                ? `Of the ${money(result.finalValue, locale)}, you put in ${money(result.totalContributed, locale)} yourself. The other ${money(result.growth, locale)} is growth, and most of it arrives in the later years, because growth is earned on earlier growth.`
                : `At a rate of 0 the total is exactly what you put in: ${money(result.totalContributed, locale)}.`}
          </p>
          <p class="notice">An illustration at the rate you typed. It is not a prediction, and no rate is guaranteed.</p>
        </div>
      </div>

      {years > 0 && (
        <figure class="growth">
          <svg
            class="growth-chart"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Line chart over ${years} years. The amount you put in rises in a straight line to ${money(last.contributed, locale)}. The total value curves upward to ${money(last.balance, locale)}.`}
          >
            <line class="axis" x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} />
            <polyline class="line-b" points={line('contributed')} stroke-dasharray="5 4" />
            <polyline class="line-a" points={line('balance')} />
            {/* Direct labels at the line ends; the dash pattern, not only the colour, tells them apart. */}
            <text class="chart-text strong" x={W - PAD.right} y={Math.max(12, y(last.balance) - 8)} text-anchor="end">
              Value {money(last.balance, locale)}
            </text>
            <text class="chart-text" x={W - PAD.right} y={Math.min(H - PAD.bottom - 6, y(last.contributed) + 16)} text-anchor="end">
              Put in {money(last.contributed, locale)} (dashed)
            </text>
            <text class="chart-text" x={PAD.left} y={H - 6}>Today</text>
            <text class="chart-text" x={W - PAD.right} y={H - 6} text-anchor="end">Year {years}</text>
          </svg>
          <figcaption>
            <details>
              <summary>The same numbers as a table</summary>
              {/* A scrollable wrap is a named, focusable region, so a keyboard can scroll it too. */}
              <div class="table-wrap" role="region" aria-label="Savings growth, year by year" tabIndex={0}>
                <table class="table numbers">
                  <thead>
                    <tr>
                      <th scope="col">Year</th>
                      <th scope="col">Put in so far</th>
                      <th scope="col">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.years.map((row) => (
                      <tr>
                        <th scope="row">{row.year}</th>
                        <td>{money(row.contributed, locale)}</td>
                        <td>{money(row.balance, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </figcaption>
        </figure>
      )}

      <HowItWorks>
        <p>Each month the total earns one twelfth of the yearly rate, and then your monthly amount is added:</p>
        <p class="formula numbers">new total = total × (1 + rate ÷ 12) + monthly amount</p>
        <p>
          That repeats every month. Because each month's growth is added to the total that earns
          next month's growth, the line bends upward. Time does more of the work than the rate:
          try halving the years and see how much of the growth disappears.
        </p>
      </HowItWorks>
    </div>
  );
}
