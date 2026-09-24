/**
 * What every calculator shares, so they all behave the same way:
 *  - numbers typed before the JavaScript arrived are adopted, not reset (slow 4G is the target);
 *  - a shared link restores the inputs, not just the results. The figures travel after the #,
 *    which browsers never send to a server; the fragment is read once, then removed from the
 *    address bar. Links made before that change used the ?query, and still work;
 *  - the chosen currency is remembered in lp:locale, except on tools whose config carries edition
 *    rules (see useLocale);
 *  - reset and copy-link work the same everywhere, and say what happened in text.
 * Nothing typed into a calculator leaves the browser.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { LOCALES, localeByCode, money, type Locale } from '../lib/format';
import { numberInputValue } from '../lib/fields';
import { linkFor, parseLinkParams } from '../lib/link-params';

export { isBlank, numberInputValue, readAmount, type ReadAmount } from '../lib/fields';

export const LOCALE_KEY = 'lp:locale';

export type Fields = Record<string, string>;

/** Accepts what people type: "1,00,000", "₹500", " 12.5 ". Anything unreadable counts as 0. */
export function toNumber(value: string): number {
  const parsed = Number(String(value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Decimals only when there are any: ₹7 beside ₹4,290 reads as one panel; ₹7.00 does not. */
export const exact = (value: number, locale: Locale) => money(value, locale, Number.isInteger(value) ? 0 : 2);

/**
 * The page's link, read once. The first call keeps location.hash and location.search, and when the
 * fragment carries figures (it contains '='), removes only the fragment from the address bar, so
 * pay figures do not stay there on a shared device. A bare '#main' from the skip link is left
 * alone. Later calls on the page return the same snapshot. Nothing is ever written to the address
 * bar while the reader types.
 *
 * A link to this same page pasted into the address bar changes only the fragment, which does not
 * load the page again, so nothing would read it. When the new fragment carries figures, the page
 * is loaded again and reads it like any other link.
 */
let snapshot: { hash: string; search: string } | null = null;

export function linkSnapshot(): { hash: string; search: string } {
  if (snapshot) return snapshot;
  // An in-page anchor on a tool page must never carry '=' in its id, or following it would reload.
  window.addEventListener('hashchange', () => {
    if (window.location.hash.includes('=')) window.location.reload();
  });
  snapshot = { hash: window.location.hash, search: window.location.search };
  // Figures leave the address bar once read, whether they came in the fragment or in an old
  // ?query: a shared phone's history keeps neither.
  if (snapshot.hash.includes('=') || snapshot.search.includes('=')) {
    try {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    } catch {
      // A sandboxed frame may refuse; the figures are still read.
    }
  }
  return snapshot;
}

/**
 * The link's values for this calculator's own fields only, fragment first, then the old ?query.
 * Each value is 24 characters or fewer, and a select's value must be one of its options
 * (src/lib/link-params.ts).
 */
export function readLinkParams<T extends Fields>(defaults: T, options?: { allowed?: Partial<Record<keyof T & string, readonly string[]>> }): Partial<T> {
  const { hash, search } = linkSnapshot();
  return parseLinkParams(hash, search, Object.keys(defaults), { allowed: options?.allowed }) as Partial<T>;
}

/** One codec key's raw value (rows, lines, others, plans), for that key's own decoder to validate. */
export function readLinkParam(key: string): string | null {
  const { hash, search } = linkSnapshot();
  return parseLinkParams(hash, search, [key])[key] ?? null;
}

/**
 * Field state for a calculator whose inputs have ids `${prefix}-${key}`.
 *
 * Link and DOM values are applied after mount, not in the initial state: the server renders the
 * defaults, and hydration leaves server-rendered input values alone, so a shared link would show
 * the default numbers while calculating with the shared ones. `allowed` lists the only values a
 * select may take, from a link or from the page before hydration.
 */
export function useFields<T extends Fields>(prefix: string, defaults: T, options?: { allowed?: Partial<Record<keyof T & string, readonly string[]>> }) {
  const [fields, setFields] = useState<T>(defaults);

  useEffect(() => {
    const fromDom: Partial<T> = {};
    for (const key of Object.keys(defaults) as (keyof T & string)[]) {
      const el = document.getElementById(`${prefix}-${key}`);
      if ((el instanceof HTMLInputElement || el instanceof HTMLSelectElement) && el.value !== defaults[key]) {
        const allowed = options?.allowed?.[key];
        if (allowed && !allowed.includes(el.value)) continue;
        fromDom[key] = el.value as T[typeof key];
      }
    }
    const fromLink = readLinkParams(defaults, options);
    // A number field blanks what it cannot show ('₹5,000'), while the sum would still read it:
    // show the figure the sum uses instead, so the field and the result agree.
    for (const key of Object.keys(fromLink) as (keyof T & string)[]) {
      const el = document.getElementById(`${prefix}-${key}`);
      if (el instanceof HTMLInputElement && el.type === 'number') fromLink[key] = numberInputValue(fromLink[key] as string) as T[typeof key];
    }
    if (Object.keys(fromDom).length > 0 || Object.keys(fromLink).length > 0) {
      // A shared link is explicit, so it wins over anything typed early.
      setFields((current) => ({ ...current, ...fromDom, ...fromLink }));
    }
  }, []);

  const set = (key: keyof T) => (event: Event) =>
    setFields((current) => ({ ...current, [key]: (event.target as HTMLInputElement | HTMLSelectElement).value }));
  const reset = () => setFields({ ...defaults });

  return { fields, setFields, set, reset };
}

/**
 * The currency the reader's own figures are shown in, remembered in lp:locale.
 *
 * Convention: a tool whose config carries edition rules (a payroll rate, a regulator's method, a
 * tax floor) either renders no CurrencyField and formats with localeByCode(localeCode), or calls
 * useLocale(localeCode, { fixed: true }), which never reads or writes lp:locale and whose choose()
 * does nothing. Then a saved $ can never put RBI or IRS figures in the wrong currency.
 */
export function useLocale(initial: string, options?: { fixed?: boolean }): { locale: Locale; code: string; choose: (code: string) => void } {
  const fixed = options?.fixed === true;
  const [code, setCode] = useState(initial);
  useEffect(() => {
    if (fixed) return;
    try {
      const saved = window.localStorage.getItem(LOCALE_KEY);
      // Only a code we know: a stored value is untrusted too.
      if (saved && LOCALES.some((l) => l.code === saved)) setCode(saved);
    } catch {
      // Private browsing or blocked storage: the edition's default is fine.
    }
  }, []);
  const choose = (next: string) => {
    if (fixed) return;
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

/** Space-separated ids, empty parts dropped; undefined when there are none. */
const ids = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ') || undefined;

/** A choice from a fixed list, with the same markup as NumberField. Renders only the listed options. */
export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  hint,
  error,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (event: Event) => void;
  hint?: string;
  error?: string;
  describedBy?: string;
}) {
  return (
    <p class="field">
      <label for={id}>{label}</label>
      {hint && <span class="hint" id={`${id}-hint`}>{hint}</span>}
      <select
        id={id}
        value={value}
        onChange={onChange}
        aria-describedby={ids(hint && `${id}-hint`, error && `${id}-error`, describedBy)}
        aria-invalid={error ? 'true' : undefined}
      >
        {options.map((option) => (
          <option value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <span class="error" id={`${id}-error`}>{error}</span>}
    </p>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onInput: (event: Event) => void;
  hint?: string;
  /** A line that is not an error, e.g. "Counted as 2", tied to the field. */
  note?: string;
  /** Shown in text under the field and tied to it; the border alone is never the signal. */
  error?: string;
  /** Extra ids the field is described by, e.g. a status line elsewhere. */
  describedBy?: string;
  suffix?: string;
  min?: string;
  max?: string;
  step?: string;
  inputMode?: 'decimal' | 'numeric';
}

export function NumberField({ id, label, value, onInput, hint, note, error, describedBy, min = '0', max, step = 'any', inputMode = 'decimal' }: NumberFieldProps) {
  return (
    <p class="field">
      <label for={id}>{label}</label>
      {hint && <span class="hint" id={`${id}-hint`}>{hint}</span>}
      <input
        id={id}
        type="number"
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={onInput}
        aria-describedby={ids(hint && `${id}-hint`, note && `${id}-note`, error && `${id}-error`, describedBy)}
        aria-invalid={error ? 'true' : undefined}
      />
      {note && <span class="field-note" id={`${id}-note`}>{note}</span>}
      {error && <span class="error" id={`${id}-error`}>{error}</span>}
    </p>
  );
}

/**
 * A list of repeated rows (payslip lines, pay-later plans) with add and remove. Keyboard and
 * screen-reader friendly: after Add, focus moves to the new row's first field; after removing a
 * row, to the first field of the row now in its place, or to Add when none is; the removal is
 * announced. Add is disabled at the cap, and says why in visible text.
 */
export function RowList({
  id,
  legend,
  hint,
  count,
  max,
  min = 0,
  addLabel,
  atMaxText,
  rowLegend,
  removeLabel,
  removedText,
  onAdd,
  onRemove,
  children,
}: {
  id: string;
  legend: string;
  hint?: string;
  count: number;
  max: number;
  min?: number;
  addLabel: string;
  atMaxText: string;
  rowLegend: (n: number) => string;
  removeLabel: (n: number) => string;
  removedText: (n: number) => string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  children: (index: number) => ComponentChildren;
}) {
  const [announced, setAnnounced] = useState('');
  const pending = useRef<{ row: number } | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const target = pending.current;
    if (!target) return;
    pending.current = null;
    const row = document.getElementById(`${id}-row-${target.row}`);
    const field = row?.querySelector<HTMLElement>('input, select');
    if (field) field.focus();
    else addButton.current?.focus();
  }, [count]);

  const atMax = count >= max;
  const add = () => {
    if (atMax) return;
    pending.current = { row: count };
    setAnnounced('');
    onAdd();
  };
  const remove = (index: number) => {
    pending.current = { row: index };
    // Removing line 2 twice in a row gives the same message; a no-break space on alternate turns
    // changes the text, so the status line is updated and spoken again.
    const text = removedText(index + 1);
    setAnnounced((prev) => (prev === text ? `${text}\u00a0` : text));
    onRemove(index);
  };

  return (
    <fieldset class="row-list" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend>{legend}</legend>
      {hint && <p class="hint" id={`${id}-hint`}>{hint}</p>}
      {Array.from({ length: count }, (_, i) => (
        <fieldset class="row-list-row" id={`${id}-row-${i}`}>
          <legend>{rowLegend(i + 1)}</legend>
          {children(i)}
          {count > min && (
            <button type="button" class="remove-line" onClick={() => remove(i)}>
              {removeLabel(i + 1)}
            </button>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        class="btn btn-secondary"
        ref={addButton}
        onClick={add}
        disabled={atMax}
        aria-describedby={atMax ? `${id}-max` : undefined}
      >
        {addLabel}
      </button>
      {atMax && <p class="hint" id={`${id}-max`}>{atMaxText}</p>}
      <p class="visually-hidden" role="status">{announced}</p>
    </fieldset>
  );
}

/** Plain-text notes under a result: what the tool assumed, or what it left out. */
export function ToolNotes({ notes, id }: { notes: string[]; id?: string }) {
  if (notes.length === 0) return null;
  return (
    <ul class="tool-notes" id={id}>
      {notes.map((note) => (
        <li>{note}</li>
      ))}
    </ul>
  );
}

/**
 * Reset, copy-link, and Share where the device has a share sheet (most phones). The link carries
 * the inputs in the # fragment, which browsers do not send in the request, and clears any old
 * ?query; nothing is sent anywhere by this site. The note under the buttons says it in plain
 * words: whoever gets the link sees the numbers, and this site never receives them.
 */
export function ToolActions({ query, onReset }: { query: Record<string, string>; onReset: () => void }) {
  const [said, setSaid] = useState('');
  const [canShare, setCanShare] = useState(false);

  // After mount, so the server-rendered markup and the first client render agree.
  useEffect(() => setCanShare(typeof navigator.share === 'function'), []);

  const link = () => linkFor(window.location.href, query);
  const say = (text: string) => {
    setSaid(text);
    window.setTimeout(() => setSaid(''), 4000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      say('Link copied.');
    } catch {
      say('Copying is blocked here. Use your browser\u2019s share or copy-address option instead.');
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: document.title, url: link() });
    } catch {
      // Closing the share sheet is not an error worth reporting.
    }
  };

  return (
    <>
      <div class="btn-row">
        <button type="button" class="btn btn-secondary btn-sm" onClick={() => { onReset(); setSaid(''); }}>Reset</button>
        <button type="button" class="btn btn-secondary btn-sm" onClick={copy}>Copy link to these numbers</button>
        {canShare && <button type="button" class="btn btn-secondary btn-sm" onClick={share}>Share</button>}
      </div>
      <p class="link-note">
        The link holds the numbers on screen, so anyone you send it to will see them. This site never receives them.
      </p>
      <p class="copied" role="status">{said}</p>
    </>
  );
}

/**
 * One line of the results ledger: label left, figure right. `main` marks the answer the tool
 * exists to give; it is set larger and closed with the double rule of a final total. `subtotal`
 * draws a single rule above a running figure, never the double rule. `op` prints the step before
 * the figure (`minus` is an alias for '−'); `note` sits on its own line under the row.
 */
export function Result({
  label,
  value,
  loss = false,
  main = false,
  minus = false,
  op,
  subtotal = false,
  note,
}: {
  label: string;
  value: ComponentChildren;
  loss?: boolean;
  main?: boolean;
  minus?: boolean;
  op?: '−' | '+' | '×';
  subtotal?: boolean;
  note?: ComponentChildren;
}) {
  const sign = op ?? (minus ? '−' : '');
  return (
    <div class={`result-block ledger-row ${main ? 'ledger-total' : ''} ${subtotal ? 'ledger-subtotal' : ''}`}>
      <p class="result-label ledger-label">{label}</p>
      <p class={`result-value ledger-figure numbers ${loss ? 'is-loss' : ''}`}>{sign}{value}</p>
      {note !== undefined && note !== null && note !== '' && <p class="ledger-note">{note}</p>}
    </div>
  );
}

/** A figure that follows from the sum but is not part of it, set as a plain row below the ledger. */
export function Fact({ label, value, loss = false }: { label: string; value: ComponentChildren; loss?: boolean }) {
  return (
    <div class="result-fact">
      <p class="result-fact-label">{label}</p>
      <p class={`result-fact-value numbers ${loss ? 'is-loss' : ''}`}>{value}</p>
    </div>
  );
}

/** The tool's one answer when it is not the sum of the ledger above it (a count, a monthly payment, a rate). */
export function Figure({ label, value, loss = false }: { label: string; value: ComponentChildren; loss?: boolean }) {
  return (
    <div class="result-figure">
      <p class={`result-figure-value numbers ${loss ? 'is-loss' : ''}`}>{value}</p>
      <p class="result-figure-label">{label}</p>
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
