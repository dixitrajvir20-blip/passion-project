import { useEffect, useState } from 'preact/hooks';
import { budgetSplit, type BudgetCategory } from '../lib/finance';
import { money, number } from '../lib/format';
import { CurrencyField, HowItWorks, NumberField, Result, toNumber, useFields, useLocale } from './tool-kit';
import './tools.css';

interface Row {
  name: string;
  amount: string;
  category: BudgetCategory;
}

interface Props {
  defaults: { income: string; incomeHint: string; rows: Row[] };
  localeCode: string;
}

const CATEGORIES: { id: BudgetCategory; label: string }[] = [
  { id: 'needs', label: 'Needs' },
  { id: 'wants', label: 'Wants' },
  { id: 'savings', label: 'Savings' },
];
const GUIDE: Record<BudgetCategory, number> = { needs: 50, wants: 30, savings: 20 };
const MAX_ROWS = 20;

/** Rows travel in a shared link as "name~amount~category|…". A link is untrusted: validate all of it. */
function encodeRows(rows: Row[]): string {
  return rows.map((r) => [r.name.replace(/[~|]/g, ' '), r.amount, r.category].join('~')).join('|');
}
function decodeRows(text: string): Row[] | null {
  const rows = text
    .split('|')
    .slice(0, MAX_ROWS)
    .map((part) => part.split('~'))
    .filter((p) => p.length === 3 && CATEGORIES.some((c) => c.id === p[2]))
    .map(([name, amount, category]) => ({
      name: name.slice(0, 40),
      amount: String(toNumber(amount.slice(0, 16))),
      category: category as BudgetCategory,
    }));
  return rows.length > 0 ? rows : null;
}

export default function BudgetPlanner({ defaults, localeCode }: Props) {
  const { fields, set, reset: resetIncome } = useFields('bp', { income: defaults.income });
  const { locale, code, choose } = useLocale(localeCode);
  const [rows, setRows] = useState<Row[]>(defaults.rows);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get('rows');
    const decoded = shared ? decodeRows(shared) : null;
    if (decoded) setRows(decoded);
  }, []);

  const income = toNumber(fields.income);
  const result = budgetSplit(
    income,
    rows.map((r) => ({ name: r.name, amount: toNumber(r.amount), category: r.category })),
  );

  const change = (index: number, patch: Partial<Row>) => setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const remove = (index: number) => setRows(rows.filter((_, i) => i !== index));
  const add = () => setRows([...rows, { name: '', amount: '0', category: 'needs' }]);
  const reset = () => {
    resetIncome();
    setRows(defaults.rows);
    setCopied('');
  };
  const copy = async () => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ income: fields.income, rows: encodeRows(rows) }).toString();
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied('Link copied.');
    } catch {
      setCopied('Copying is blocked here.');
    }
    window.setTimeout(() => setCopied(''), 4000);
  };

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>
          <CurrencyField id="bp-currency" code={code} onChoose={choose} />
          <NumberField id="bp-income" label="What comes in each month" hint={defaults.incomeHint} value={fields.income} onInput={set('income')} />

          <fieldset class="budget-rows">
            <legend>Where it goes</legend>
            {rows.map((row, index) => {
              const n = index + 1;
              return (
                <div class="budget-row">
                  <label class="visually-hidden" for={`bp-name-${index}`}>Name of line {n}</label>
                  <input
                    id={`bp-name-${index}`}
                    type="text"
                    class="budget-name"
                    value={row.name}
                    maxLength={40}
                    placeholder="What is it for?"
                    onInput={(e) => change(index, { name: (e.target as HTMLInputElement).value })}
                  />
                  <label class="visually-hidden" for={`bp-amount-${index}`}>Amount for {row.name || `line ${n}`}</label>
                  <input
                    id={`bp-amount-${index}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={row.amount}
                    onInput={(e) => change(index, { amount: (e.target as HTMLInputElement).value })}
                  />
                  <label class="visually-hidden" for={`bp-cat-${index}`}>Kind of spending for {row.name || `line ${n}`}</label>
                  <select
                    id={`bp-cat-${index}`}
                    value={row.category}
                    onChange={(e) => change(index, { category: (e.target as HTMLSelectElement).value as BudgetCategory })}
                  >
                    {CATEGORIES.map((c) => <option value={c.id}>{c.label}</option>)}
                  </select>
                  <button type="button" class="btn btn-secondary btn-sm" onClick={() => remove(index)}>
                    Remove<span class="visually-hidden"> {row.name || `line ${n}`}</span>
                  </button>
                </div>
              );
            })}
            <button type="button" class="btn btn-secondary" onClick={add} disabled={rows.length >= MAX_ROWS}>Add a line</button>
          </fieldset>

          <div class="btn-row">
            <button type="button" class="btn btn-secondary" onClick={reset}>Reset</button>
            <button type="button" class="btn btn-secondary" onClick={copy}>Copy link to these numbers</button>
          </div>
          <p class="copied" role="status">{copied}</p>
        </div>

        <div class="results">
          <h2>What it means</h2>
          {CATEGORIES.map((c) => (
            <Result
              label={`${c.label}: ${number(Math.round(result.shares[c.id]), locale)}% of what comes in`}
              value={money(result.totals[c.id], locale)}
            />
          ))}
          <Result
            label={result.leftover >= 0 ? 'Not given a job yet' : 'More than comes in'}
            value={money(Math.abs(result.leftover), locale)}
            loss={result.leftover < 0}
          />

          <p class="plain">
            {income <= 0
              ? 'Enter what comes in each month to see the split.'
              : result.leftover < 0
                ? `This plan spends ${money(-result.leftover, locale)} more than comes in, so at least one line has to come down.`
                : result.leftover === 0
                  ? 'Every part of what comes in has a job.'
                  : `${money(result.leftover, locale)} has no job yet. Money without one tends to disappear, so give it a line, even if the line is "whatever I like".`}
          </p>
          <p class="notice">
            A common starting point is {GUIDE.needs}% needs, {GUIDE.wants}% wants, {GUIDE.savings}% savings. It is a
            guideline, not a rule: at a low income needs take far more, and that is arithmetic, not a failing.
          </p>
        </div>
      </div>

      <HowItWorks>
        <p>Each line is added to its kind, and each kind is shown as a share of what comes in:</p>
        <p class="formula numbers">share = total for that kind ÷ what comes in × 100</p>
        <p>
          What is left is what comes in minus every line. Needs are what you must pay to get through
          the month; wants are what you choose to. Money given at home usually counts as a need. Which
          side a line sits on is your call, and it is the most useful argument to have with yourself.
        </p>
      </HowItWorks>
    </div>
  );
}
