/**
 * Pay-later plans against one payday: what is left of this pay after living costs, savings and
 * every pay-later payment due before the next pay, and what is still owed on the plans after them.
 *
 * The maths, the sentence and the messages are pure functions in src/lib/tools/pay-later-payday.ts;
 * the plans travel in a link through src/lib/plans-link.ts. Plans are numbered, never named, so no
 * shop or lender name is ever typed, stored or linked. The fee note is a Europe or US figure and is
 * written in the edition's currency whatever the picker says; an edition whose config carries a
 * sourced rule (the US) shows no currency picker at all (the kit's useLocale convention).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { LOCALES, localeByCode, percent } from '../lib/format';
import { decodePlans, type PlanRowText } from '../lib/plans-link';
import {
  MAX_PLAN_ROWS,
  errorText,
  figure,
  linkQuery,
  paydayAfterPlans,
  paydaySentence,
  readField,
  showsInField,
  takeWords,
  textParts,
  theseWords,
  type FieldKind,
  type PayLaterPaydayConfig,
  type TextPart,
} from '../lib/tools/pay-later-payday';
import type { Edition } from '../lib/tools/types';
import {
  CurrencyField,
  Fact,
  HowItWorks,
  NumberField,
  Result,
  RowList,
  SelectField,
  ToolActions,
  readLinkParam,
  readLinkParams,
  useFields,
  useLocale,
} from './tool-kit';
import './tools.css';
import './pay-later-payday.css';

interface Props {
  config: PayLaterPaydayConfig;
  edition: Edition;
  localeCode: string;
  prefix: string;
}

interface Row extends PlanRowText {
  /** Stable across removals, so a row's inputs are never reused for the row that moves up. */
  id: number;
}

const DUE_OPTIONS = ['1', '2', '3', '4'].map((value) => ({ value, label: value }));
const LOCALE_CODES = LOCALES.map((l) => l.code);
const NEW_PLAN: PlanRowText = { amount: '', k: '2', n: '4', d: '1' };
const PLAN_KEYS = ['amount', 'k', 'n', 'd'] as const;

function Parts({ parts }: { parts: TextPart[] }) {
  return (
    <>
      {parts.map((part) =>
        'href' in part ? (
          <a href={part.href} rel="noopener noreferrer">
            {part.text}
          </a>
        ) : (
          part.text
        ),
      )}
    </>
  );
}

export default function PayLaterPayday({ config, localeCode, prefix }: Props) {
  const { pay, living, savings, plans } = config.defaults;
  const { fields, setFields, set, reset: resetFields } = useFields('plp', { pay, living, savings });

  // A tool whose edition carries a sourced rule keeps to the edition's currency (tool-kit useLocale).
  const fixed = (config.rules ?? []).length > 0;
  const saved = useLocale(localeCode, { fixed });
  // A link's currency applies to this page view only; lp:locale changes only when the reader picks.
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const code = fixed ? localeCode : (linkCode ?? saved.code);
  const locale = localeByCode(code);
  const editionLocale = localeByCode(localeCode);
  const pick = (next: string) => {
    setLinkCode(null);
    saved.choose(next);
  };

  const nextId = useRef(plans.length);
  const withIds = (list: readonly PlanRowText[]): Row[] => list.map((row) => ({ ...row, id: nextId.current++ }));
  const [rows, setRows] = useState<Row[]>(() => plans.map((row, i) => ({ ...row, id: i })));

  useEffect(() => {
    // A link value its number input cannot show ('abc', '1e999', '+5') would leave the field looking
    // blank while the tool kept the hidden text. Such a field goes back to what the page held.
    const linked = readLinkParams({ pay: '', living: '', savings: '' });
    for (const key of ['pay', 'living', 'savings'] as const) {
      const value = linked[key];
      if (value === undefined || showsInField(value)) continue;
      const el = document.getElementById(`plp-${key}`);
      const onPage = el instanceof HTMLInputElement && showsInField(el.value) ? el.value : config.defaults[key];
      setFields((current) => ({ ...current, [key]: onPage }));
    }

    // Figures typed into the server-rendered rows before the JavaScript arrived are kept, in the
    // same rows (same ids), so the inputs are not rebuilt and keyboard focus stays where it was.
    const typed = plans.map((row, i) => {
      const out = { ...row };
      for (const key of PLAN_KEYS) {
        const el = document.getElementById(`plp-plan-${i}-${key}`);
        if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
        if (key === 'd' && !DUE_OPTIONS.some((o) => o.value === el.value)) continue;
        out[key] = el.value;
      }
      return out;
    });
    const adopted = typed.some((row, i) => PLAN_KEYS.some((key) => row[key] !== plans[i][key]))
      ? typed.map((row, i) => ({ ...row, id: i }))
      : null;

    // A shared link wins. 'plans=' with nothing after it is a link made with every plan removed.
    const shared = readLinkParam('plans');
    const decoded = shared ? decodePlans(shared) : null;
    if (shared === '') setRows([]);
    else if (decoded) setRows(withIds(decoded));
    else if (adopted) setRows(adopted);

    if (!fixed) {
      const cur = readLinkParams({ cur: '' }, { allowed: { cur: LOCALE_CODES } }).cur;
      if (cur) setLinkCode(cur);
    }
  }, []);

  const change = (index: number, key: (typeof PLAN_KEYS)[number]) => (event: Event) => {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };
  const add = () => setRows((current) => (current.length >= MAX_PLAN_ROWS ? current : [...current, ...withIds([NEW_PLAN])]));
  const remove = (index: number) => setRows((current) => current.filter((_, i) => i !== index));
  const reset = () => {
    resetFields();
    setRows(withIds(plans));
    setLinkCode(null);
  };

  const result = paydayAfterPlans({
    pay: readField(fields.pay),
    living: readField(fields.living),
    savings: readField(fields.savings),
    plans: rows.map((row) => ({ amount: readField(row.amount), k: readField(row.k), n: readField(row.n), d: readField(row.d) })),
  });
  const errors = result.status === 'invalid' ? result.errors : {};
  const error = (key: string, kind: FieldKind, remaining?: number) => {
    const code = errors[key];
    return code ? errorText(kind, code, locale, remaining) : undefined;
  };
  const remainingOn = (row: Row) => {
    const k = readField(row.k);
    const n = readField(row.n);
    return k !== null && n !== null ? n - k + 1 : 0;
  };

  const m = (value: number) => figure(value, locale);
  const words = config.words;
  const sentence = paydaySentence(result, locale, words);
  const feeNote = textParts(config.feeNote.text, config, editionLocale);

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <NumberField
            id="plp-pay"
            label="Pay arriving this payday"
            hint="What reaches your account from this pay, after deductions: your net or take-home pay."
            value={fields.pay}
            onInput={set('pay')}
            error={error('pay', 'pay')}
          />
          <NumberField
            id="plp-living"
            label="Living costs until your next pay"
            hint="Rent, bills, food, transport and phone: what this pay has to cover before the next one arrives."
            value={fields.living}
            onInput={set('living')}
            error={error('living', 'living')}
          />
          <NumberField
            id="plp-savings"
            label="Moved to savings from this pay"
            hint="Leave at 0 if nothing moves."
            value={fields.savings}
            onInput={set('savings')}
            error={error('savings', 'savings')}
          />

          <RowList
            id="plp-plans"
            legend="Pay-later payments due before your next pay"
            hint={`Every payment that leaves before your next pay arrives, not only those due on payday. Copy each plan’s numbers as it shows them: for “payment 2 of 4”, 2 and 4. A plan paid every two weeks, against pay that arrives monthly, has 2 or 3 payments due before your next pay, counting the one due on payday. Plans are numbered, so no shop or lender name is needed.`}
            count={rows.length}
            max={MAX_PLAN_ROWS}
            addLabel="Add a plan"
            atMaxText={`This tool holds up to ${MAX_PLAN_ROWS} plans. Any more are left out of these totals, so the plans would take more than shown.`}
            rowLegend={(n) => `Plan ${n}`}
            removeLabel={(n) => `Remove Plan ${n}`}
            removedText={(n) => (n < rows.length ? `Plan ${n} removed. The plans after it move up one.` : `Plan ${n} removed.`)}
            onAdd={add}
            onRemove={remove}
          >
            {(i) => {
              const row = rows[i];
              return (
                <div class="plp-plan" key={row.id}>
                  <NumberField
                    id={`plp-plan-${i}-amount`}
                    label="Payment amount"
                    value={row.amount}
                    onInput={change(i, 'amount')}
                    error={error(`plans.${i}.amount`, 'amount')}
                  />
                  <div class="plp-counts">
                    <NumberField
                      id={`plp-plan-${i}-k`}
                      label="Payment number"
                      value={row.k}
                      onInput={change(i, 'k')}
                      inputMode="numeric"
                      step="1"
                      min="1"
                      max="48"
                      error={error(`plans.${i}.k`, 'k')}
                    />
                    <NumberField
                      id={`plp-plan-${i}-n`}
                      label="Out of how many"
                      value={row.n}
                      onInput={change(i, 'n')}
                      inputMode="numeric"
                      step="1"
                      min="1"
                      max="48"
                      error={error(`plans.${i}.n`, 'n')}
                    />
                  </div>
                  <SelectField
                    id={`plp-plan-${i}-d`}
                    label="Payments due before your next pay"
                    value={row.d}
                    options={DUE_OPTIONS}
                    onChange={change(i, 'd')}
                    error={error(`plans.${i}.d`, 'd', remainingOn(row))}
                  />
                </div>
              );
            }}
          </RowList>

          {!fixed && <CurrencyField id="plp-currency" code={code} onChoose={pick} />}
          <ToolActions query={linkQuery(fields, rows, code)} onReset={reset} />
        </div>

        <div class="results">
          <h2>What it comes to</h2>
          {result.status !== 'invalid' && result.status !== 'no-pay' && (
            <>
              <Result label="Pay arriving this payday" value={m(result.pay)} />
              <Result minus label="Living costs" value={m(result.living)} />
              <Result subtotal label="Left after living costs" value={m(result.afterLiving)} loss={result.afterLiving < 0} />
              {result.savings > 0 && (
                <>
                  <Result minus label="Moved to savings" value={m(result.savings)} />
                  <Result subtotal label="Left after living costs and savings" value={m(result.beforePlans)} loss={result.beforePlans < 0} />
                </>
              )}
              {result.lines.map((line) => (
                <Result minus label={line.label} value={m(line.amount)} />
              ))}
              <Result
                main
                label={result.left < 0 ? 'Short before your next pay' : 'Left until your next pay'}
                value={m(Math.abs(result.left))}
                loss={result.left < 0}
              />
              {result.count > 0 && (
                <>
                  <Fact
                    label={takeWords(result.plansCounted)}
                    value={`${m(result.plansTotal)}, ${percent(result.share ?? 0, locale, 1)} of this pay`}
                  />
                  <Fact
                    label={`Owed on ${result.plansCounted === 1 ? 'this plan' : 'these plans'}, counting ${theseWords(result.count, words)}`}
                    value={m(result.owedIncluding)}
                  />
                  <Fact label={`Still owed after ${theseWords(result.count, words)}`} value={m(result.owedAfter)} />
                </>
              )}
            </>
          )}

          <p class="plain" role="status">{sentence}</p>
          <p class="notice">
            {config.feeNote.label}: <Parts parts={feeNote} />
          </p>
        </div>
      </div>

      <HowItWorks>
        <p class="formula numbers">What is left = pay − living costs − savings − every pay-later payment due before your next pay</p>
        <p>
          Each plan’s line is its payment × the number of its payments due before your next pay, which you choose from 1 to 4:
          the tool does not know the plan’s dates, so it counts payments, not days. A plan paid every two weeks against pay that
          arrives monthly has 2 or 3 before the next pay; one on the same schedule as your pay has 1.
        </p>
        <p>
          Owed on the plans, counting these payments = each payment × (total payments − payment number + 1). Still owed after
          them = each payment × (total payments − payment number − payments due before your next pay + 1). Both assume every
          payment left on a plan is the same size, as in the usual split into four. A plan whose last payment is different, a
          plan that charges interest, or one whose dates have been moved is not worked out here; for a plan that charges
          interest, the <a href={`${prefix}/tools/loan`}>loan calculator</a> works out the monthly payment. The plans’ share is
          what they take ÷ this pay. The tool holds up to {MAX_PLAN_ROWS} plans; any more are left out of these totals, so the
          plans would take more than shown. A late fee or a bank charge is not added to the sum.
        </p>
        <p>
          The tool takes no interest rate. At 0% interest a plan charges nothing extra while every payment lands on time; what is
          owed is the same either way.
        </p>
        <p>
          What this adds to the <a href={`${prefix}/tools/budget`}>budget planner</a>: the planner takes one amount per line for a
          month; this counts each plan’s payments before your next pay and shows what is still owed on the plans after them.
        </p>
        {config.details.map((detail) => (
          <p>
            <Parts parts={textParts(detail.text, config, editionLocale)} /> Source:{' '}
            <a href={detail.source.url} rel="noopener noreferrer">
              {detail.source.title}
            </a>
            .
          </p>
        ))}
        <p>
          Nothing you type leaves your browser. A copied link carries the numbers after the #, which browsers do not send to any
          server; anyone you send it to sees them. The page takes them out of the address bar as soon as it has read them.
        </p>
      </HowItWorks>
    </div>
  );
}
