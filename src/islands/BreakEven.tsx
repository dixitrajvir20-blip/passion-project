import { useEffect, useMemo, useState } from 'preact/hooks';
import { breakEven, profitAtUnits } from '../lib/finance';
import { LOCALES, money, number, localeByCode } from '../lib/format';
import './tools.css';

const LOCALE_KEY = 'lp:locale';

interface Fields {
  fixed: string;
  variable: string;
  price: string;
  units: string;
}

interface Props {
  defaults: Fields;
  unitName: string;
  fixedHint: string;
  variableHint: string;
  localeCode: string;
}

function readQuery(): Partial<Fields> {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  const out: Partial<Fields> = {};
  for (const key of ['fixed', 'variable', 'price', 'units'] as const) {
    const value = q.get(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

export default function BreakEven({
  defaults,
  unitName,
  fixedHint,
  variableHint,
  localeCode: initialLocale,
}: Props) {
  const [fields, setFields] = useState<Fields>(defaults);
  const [localeCode, setLocaleCode] = useState(initialLocale);
  const [copied, setCopied] = useState(false);

  // Applied after mount, not in the initial state: the server renders DEFAULTS, and
  // hydration leaves server-rendered input values alone, so shared links would show
  // the default numbers while calculating the shared ones. Anything typed into the
  // static inputs before the JS arrived (slow 4G is the target device) is adopted too,
  // so a fast reader's numbers are never silently reset; a shared link still wins.
  useEffect(() => {
    const fromDom: Partial<Fields> = {};
    for (const key of ['fixed', 'variable', 'price', 'units'] as const) {
      const el = document.getElementById(`be-${key}`);
      if (el instanceof HTMLInputElement && el.value !== defaults[key]) fromDom[key] = el.value;
    }
    const fromQuery = readQuery();
    if (Object.keys(fromDom).length > 0 || Object.keys(fromQuery).length > 0) {
      setFields((current) => ({ ...current, ...fromDom, ...fromQuery }));
    }

    try {
      const saved = window.localStorage.getItem(LOCALE_KEY);
      if (saved) setLocaleCode(saved);
    } catch {
      // Private browsing or blocked storage: the default locale is fine.
    }
  }, []);

  const locale = localeByCode(localeCode);
  // Decimals only when there are any: ₹7 beside ₹4,290 reads as one panel, ₹7.00 does not.
  const exact = (value: number) => money(value, locale, Number.isInteger(value) ? 0 : 2);

  const onLocaleChange = (code: string) => {
    setLocaleCode(code);
    try {
      window.localStorage.setItem(LOCALE_KEY, code);
    } catch {
      // Preference just won't persist.
    }
  };

  const set = (key: keyof Fields) => (event: Event) => {
    setFields({ ...fields, [key]: (event.target as HTMLInputElement).value });
  };

  const nums = useMemo(() => {
    const toNumber = (v: string) => {
      const parsed = Number(v.replace(/[^0-9.\-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return {
      fixed: toNumber(fields.fixed),
      variable: toNumber(fields.variable),
      price: toNumber(fields.price),
      units: toNumber(fields.units),
    };
  }, [fields]);

  const result = breakEven(nums.fixed, nums.variable, nums.price);
  const profit = profitAtUnits(nums.fixed, nums.variable, nums.price, nums.units);

  const reset = () => {
    setFields({ ...defaults });
    setCopied(false);
  };

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams(fields as unknown as Record<string, string>).toString();
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div class="tool">
      <div class="tool-grid">
        <div class="inputs">
          <h2>Your numbers</h2>

          <p class="field">
            <label for="be-currency">Currency</label>
            <select
              id="be-currency"
              value={localeCode}
              onChange={(e) => onLocaleChange((e.target as HTMLSelectElement).value)}
            >
              {LOCALES.map((l) => (
                <option value={l.code}>{l.label}</option>
              ))}
            </select>
          </p>

          <p class="field">
            <label for="be-fixed">Fixed costs per month</label>
            <span class="hint" id="be-fixed-hint">
              {fixedHint}
            </span>
            <input
              id="be-fixed"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={fields.fixed}
              onInput={set('fixed')}
              aria-describedby="be-fixed-hint"
            />
          </p>

          <p class="field">
            <label for="be-variable">Cost to make one</label>
            <span class="hint" id="be-variable-hint">
              {variableHint}
            </span>
            <input
              id="be-variable"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={fields.variable}
              onInput={set('variable')}
              aria-describedby="be-variable-hint"
            />
          </p>

          <p class="field">
            <label for="be-price">Price you charge</label>
            <input
              id="be-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={fields.price}
              onInput={set('price')}
              aria-describedby={result.viable ? undefined : 'be-price-error'}
              aria-invalid={result.viable ? undefined : 'true'}
            />
            {!result.viable && (
              <span class="error" id="be-price-error">
                Your price needs to be higher than the cost to make one. At this price every
                sale loses {exact(Math.abs(result.contributionMargin))}.
              </span>
            )}
          </p>

          <p class="field">
            <label for="be-units">How many {unitName} you expect to sell per month</label>
            <input
              id="be-units"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={fields.units}
              onInput={set('units')}
            />
          </p>

          <div class="btn-row">
            <button type="button" class="btn btn-secondary" onClick={reset}>
              Reset
            </button>
            <button type="button" class="btn btn-secondary" onClick={copyLink}>
              Copy link to these numbers
            </button>
          </div>
          <p class="copied" role="status">{copied ? 'Link copied.' : ''}</p>
        </div>

        <div class="results">
          <h2>What it means</h2>

          <div class="result-block">
            <p class="result-label">You keep this much per sale</p>
            <p class="result-value numbers">{exact(result.contributionMargin)}</p>
          </div>

          <div class="result-block">
            <p class="result-label">{unitName[0].toUpperCase() + unitName.slice(1)} to break even each month</p>
            <p class="result-value numbers">
              {result.viable ? number(result.units!, locale) : 'Not reachable'}
            </p>
          </div>

          <div class="result-block">
            <p class="result-label">Sales needed to break even</p>
            <p class="result-value numbers">
              {result.viable ? money(result.revenue!, locale) : '—'}
            </p>
          </div>

          <div class="result-block">
            <p class="result-label">
              Profit at {number(nums.units, locale)} {unitName}
            </p>
            <p class={`result-value numbers ${profit < 0 ? 'is-loss' : ''}`}>
              {money(profit, locale)}
            </p>
          </div>

          <p class="plain">
            {result.viable
              ? `You keep ${exact(result.contributionMargin)} from every sale. Once you have sold ${number(result.units!, locale)} ${unitName} in a month, your fixed costs are covered and everything after that is profit.`
              : 'Right now each sale costs you more than it brings in, so selling more makes the loss bigger. Raise the price or cut the cost to make one.'}
          </p>
        </div>
      </div>

      <details class="how">
        <summary>How this is worked out</summary>
        <p>
          The amount you keep per sale is called the <strong>contribution margin</strong>:
        </p>
        <p class="formula numbers">price − cost to make one = margin per unit</p>
        <p>Break-even is your fixed costs divided by that margin, rounded up to a whole unit:</p>
        <p class="formula numbers">fixed costs ÷ margin per unit = units to break even</p>
        <p>
          It rounds up because you cannot sell part of one. If the margin is zero or
          negative there is no break-even point at all — that is why the calculator says
          "not reachable" instead of showing a number.
        </p>
      </details>
    </div>
  );
}
