/**
 * Card balance at the minimum payment. The Props interface is fixed by
 * src/pages/[region]/tools/[tool].astro; everything edition-bound (the minimum rule, how interest
 * is charged, the labels, hints and sources) arrives in config from the page's edition.
 *
 * The rules belong to an edition, so there is no currency field: money is formatted in the
 * edition's own locale and lp:locale is never read or written. A saved $ can never put RBI's rule
 * in dollars. The rule and the interest model are not fields and never travel in a link, so a US
 * link opened on the India page runs India's rule.
 */
import { formatDuration, localeByCode, money, number, plural, ratePercent } from '../lib/format';
import { toBasisPoints } from '../lib/finance';
import {
  INVALID_SENTENCE,
  compareSentence,
  minimumRun,
  readCardFields,
  runSentence,
  type CardMinimumConfig,
  type MinimumRunInput,
} from '../lib/tools/card-minimum';
import type { Edition } from '../lib/tools/types';
import { Figure, HowItWorks, NumberField, Result, ToolActions, ToolNotes, useFields } from './tool-kit';
import './tools.css';
import './card-minimum.css';

interface Props {
  config: CardMinimumConfig;
  edition: Edition;
  localeCode: string;
  prefix: string;
}

export default function CardMinimum({ config, localeCode }: Props) {
  const locale = localeByCode(localeCode);
  const { fields, set, reset } = useFields('cm', config.defaults);
  const { inputs, compare, errors } = readCardFields(fields, locale, config.floorError);

  const base: MinimumRunInput | null = inputs && { ...inputs, rule: config.rule, interestBase: config.interestBase };
  const run = base ? minimumRun(base) : null;
  const fixedRun = base && compare !== undefined ? minimumRun({ ...base, fixed: compare }) : null;

  // Cash-book style: every ledger figure to the paisa or cent.
  const cash = (value: number) => money(value, locale, 2);
  const first = run?.first;
  const wholeStatement = first !== undefined && first.payment >= first.owed;
  const aprAboveZero = inputs !== null && toBasisPoints(inputs.aprPercent) > 0;

  let figure = { value: '—', label: 'paying only the minimum' };
  if (run?.months != null) {
    figure = { value: `${number(run.months, locale)} ${plural(run.months, 'month', 'months', locale)}`, label: `paying only the minimum: ${formatDuration(run.months)}` };
  } else if (run?.reason === 'over-100-years') {
    figure = { value: 'Over 100 years', label: 'to clear it paying only the minimum' };
  } else if (run) {
    figure = { value: '—', label: 'the balance does not fall on this rule' };
  }

  const sentence =
    run && inputs
      ? [runSentence(run, inputs, config.never, locale), fixedRun && compare !== undefined ? compareSentence(fixedRun, compare, locale) : '']
          .filter(Boolean)
          .join(' ')
      : INVALID_SENTENCE;

  const minPercentText = ratePercent(inputs?.minPercent ?? Number(config.defaults.minPercent), locale, 2);
  const fill = (text: string) => text.split('{minPercent}%').join(minPercentText);

  const paidInFull = config.paidInFull.text.replace(/\.$/, '');

  return (
    <div class="tool card-minimum">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <NumberField
            id="cm-balance"
            label={config.labels.balance}
            hint={config.hints.balance}
            value={fields.balance}
            onInput={set('balance')}
            error={errors.balance}
          />
          <NumberField
            id="cm-apr"
            label={config.labels.apr}
            hint={config.hints.apr}
            value={fields.apr}
            onInput={set('apr')}
            max="200"
            error={errors.apr}
          />
          <NumberField
            id="cm-minPercent"
            label={config.labels.minPercent}
            hint={config.hints.minPercent}
            value={fields.minPercent}
            onInput={set('minPercent')}
            max="100"
            error={errors.minPercent}
          />
          <NumberField
            id="cm-minFloor"
            label={config.labels.minFloor}
            hint={config.hints.minFloor}
            value={fields.minFloor}
            onInput={set('minFloor')}
            min="1"
            error={errors.minFloor}
          />
          <NumberField
            id="cm-compare"
            label={config.labels.compare}
            hint={config.hints.compare}
            value={fields.compare}
            onInput={set('compare')}
            error={errors.compare}
          />
          <ToolActions query={fields} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it means</h2>
          <Figure label={figure.label} value={figure.value} />

          {run && first && (
            <>
              <h3>Month one, line by line</h3>
              {config.interestBase === 'statement' ? (
                <>
                  <Result label="Owed now" value={cash(first.owed)} />
                  <Result op="+" label="Interest for the month" value={cash(first.interest)} />
                  <Result op="−" label={wholeStatement ? 'Whole statement paid' : 'Minimum paid'} value={cash(first.payment)} />
                  <Result main label="Owed next month" value={cash(first.next)} />
                </>
              ) : (
                <>
                  <Result label="Statement balance" value={cash(first.owed)} />
                  <Result op="−" label={wholeStatement ? 'Whole statement paid' : 'Minimum paid'} value={cash(first.payment)} />
                  <Result subtotal label="Carried" value={cash(first.carried)} />
                  <Result op="+" label="Interest on what carried" value={cash(first.interest)} />
                  <Result main label="Next statement" value={cash(first.next)} />
                </>
              )}
            </>
          )}

          {run && first && run.months !== null && (
            <>
              <h3>Paying only the minimum, to the end</h3>
              <Result label="Owed now" value={cash(first.owed)} />
              {aprAboveZero && <Result op="+" label={`Interest over ${formatDuration(run.months)}`} value={cash(run.totalInterest)} />}
              <Result main label="Total paid" value={cash(run.totalPaid)} />
            </>
          )}

          <p class="plain" role="status">{sentence}</p>
          <p class="notice">
            {paidInFull} (<a href={config.paidInFull.source.url} rel="noopener noreferrer">{config.paidInFull.source.title}</a>).
          </p>
          <ToolNotes notes={config.assumptions} />
        </div>
      </div>

      {run && run.months !== null && run.months > 1 && (
        <details class="how">
          <summary>Year by year</summary>
          <div class="table-wrap">
            <table class="table numbers">
              <caption class="visually-hidden">Paying only the minimum, year by year</caption>
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col">Paid that year</th>
                  <th scope="col">Of which interest</th>
                  <th scope="col">Still owed</th>
                </tr>
              </thead>
              <tbody>
                {run.years.map((row) => (
                  <tr>
                    <th scope="row">{row.year}</th>
                    <td>{cash(row.paid)}</td>
                    <td>{cash(row.interest)}</td>
                    <td>{cash(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <HowItWorks>
        <p>{config.howItWorks.intro}</p>
        {config.howItWorks.formulas.map((formula) => (
          <p class="formula numbers">{fill(formula)}</p>
        ))}
        {config.howItWorks.paragraphs.map((paragraph) => (
          <p>{paragraph}</p>
        ))}
      </HowItWorks>
    </div>
  );
}
