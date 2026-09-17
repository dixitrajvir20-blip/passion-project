/**
 * What every calculator shares, so they all behave the same way:
 *  - numbers typed before the JavaScript arrived are adopted, not reset (slow 4G is the target);
 *  - a shared link restores the inputs, not just the results;
 *  - the chosen currency is remembered in lp:locale;
 *  - reset and copy-link work the same everywhere, and say what happened in text.
 * Nothing typed into a calculator leaves the browser.
 */
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { LOCALES, localeByCode, money, type Locale } from '../lib/format';

export const LOCALE_KEY = 'lp:locale';

export type Fields = Record<string, string>;

/** Accepts what people type: "1,00,000", "₹500", " 12.5 ". Anything unreadable counts as 0. */
export function toNumber(value: string): number {
  const parsed = Number(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Decimals only when there are any: ₹7 beside ₹4,290 reads as one panel; ₹7.00 does not. */
export const exact = (value: number, locale: Locale) => money(value, locale, Number.isInteger(value) ? 0 : 2);

function readQuery<T extends Fields>(defaults: T): Partial<T> {
  const query = new URLSearchParams(window.location.search);
  const out: Partial<T> = {};
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    const value = query.get(key);
    // A link is untrusted input: keep it short and numeric-looking before it reaches a field.
    if (value !== null && value.length <= 24) out[key] = value as T[typeof key];
  }
  return out;
}

/**
 * Field state for a calculator whose inputs have ids `${prefix}-${key}`.
 *
 * Query and DOM values are applied after mount, not in the initial state: the server renders the
 * defaults, and hydration leaves server-rendered input values alone, so a shared link would show
 * the default numbers while calculating with the shared ones.
 */
export function useFields<T extends Fields>(prefix: string, defaults: T) {
  const [fields, setFields] = useState<T>(defaults);

  useEffect(() => {
    const fromDom: Partial<T> = {};
    for (const key of Object.keys(defaults) as (keyof T & string)[]) {
      const el = document.getElementById(`${prefix}-${key}`);
      if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.value !== defaults[key]) {
        fromDom[key] = el.value as T[typeof key];
      }
    }
    const fromQuery = readQuery(defaults);
    if (Object.keys(fromDom).length > 0 || Object.keys(fromQuery).length > 0) {
      // A shared link is explicit, so it wins over anything typed early.
      setFields((current) => ({ ...current, ...fromDom, ...fromQuery }));
    }
  }, []);

  const set = (key: keyof T) => (event: Event) =>
    setFields((current) => ({ ...current, [key]: (event.target as HTMLInputElement | HTMLSelectElement).value }));
  const reset = () => setFields({ ...defaults });

  return { fields, setFields, set, reset };
}

export function useLocale(initial: string): { locale: Locale; code: string; choose: (code: string) => void } {
  const [code, setCode] = useState(initial);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LOCALE_KEY);
      // Only a code we know: a stored value is untrusted too.
      if (saved && LOCALES.some((l) => l.code === saved)) setCode(saved);
    } catch {
      // Private browsing or blocked storage: the edition's default is fine.
    }
  }, []);
  const choose = (next: string) => {
    setCode(next);
    try {
      window.localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // The preference just will not persist.
    }
  };
  return { locale: localeByCode(code), code, choose };
}

export function CurrencyField({ id, code, onChoose }: { id: string; code: string; onChoose: (code: string) => void }) {
  return (
    <p class="field">
      <label for={id}>Currency</label>
      <select id={id} value={code} onChange={(e) => onChoose((e.target as HTMLSelectElement).value)}>
        {LOCALES.map((l) => (
          <option value={l.code}>{l.label}</option>
        ))}
      </select>
    </p>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onInput: (event: Event) => void;
  hint?: string;
  /** Shown in text under the field and tied to it; the border alone is never the signal. */
  error?: string;
  suffix?: string;
  min?: string;
  max?: string;
}

export function NumberField({ id, label, value, onInput, hint, error, min = '0', max }: NumberFieldProps) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <p class="field">
      <label for={id}>{label}</label>
      {hint && <span class="hint" id={`${id}-hint`}>{hint}</span>}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step="any"
        value={value}
        onInput={onInput}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
      />
      {error && <span class="error" id={`${id}-error`}>{error}</span>}
    </p>
  );
}

/** Reset and copy-link. The link carries the inputs in the query string and nothing else. */
export function ToolActions({ query, onReset }: { query: Record<string, string>; onReset: () => void }) {
  const [copied, setCopied] = useState('');
  const copy = async () => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams(query).toString();
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied('Link copied.');
    } catch {
      setCopied('Copying is blocked here. The address bar has the same link once you change a number.');
    }
    window.setTimeout(() => setCopied(''), 4000);
  };
  return (
    <>
      <div class="btn-row">
        <button type="button" class="btn btn-secondary" onClick={() => { onReset(); setCopied(''); }}>Reset</button>
        <button type="button" class="btn btn-secondary" onClick={copy}>Copy link to these numbers</button>
      </div>
      <p class="copied" role="status">{copied}</p>
    </>
  );
}

export function Result({ label, value, loss = false }: { label: string; value: ComponentChildren; loss?: boolean }) {
  return (
    <div class="result-block">
      <p class="result-label">{label}</p>
      <p class={`result-value numbers ${loss ? 'is-loss' : ''}`}>{value}</p>
    </div>
  );
}

export function HowItWorks({ children }: { children: ComponentChildren }) {
  return (
    <details class="how">
      <summary>How this is worked out</summary>
      {children}
    </details>
  );
}

export const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
