import { useEffect, useRef, useState } from 'preact/hooks';
import {
  activeCategories,
  allChoices,
  gpcEnabled,
  makeRecord,
  needsPrompt,
  readConsent,
  writeConsent,
  type CategoryDef,
  type ConsentCategory,
  type ConsentRecord,
} from '../lib/consent';
import './consent.css';

interface Props {
  categories: CategoryDef[];
  version: number;
}

const NECESSARY = [
  { key: 'lp:region', what: 'Which edition you chose, so the front page can offer it again.' },
  { key: 'lp:locale', what: 'The currency you picked in a calculator.' },
  { key: 'lp:progress', what: 'Lessons you have finished, quiz scores, and when each quick-check question comes back for review. Stays on this device.' },
  { key: 'lp:consent', what: 'Your answer on this screen, so we do not ask again.' },
];

function publish(record: ConsentRecord | null, categories: CategoryDef[]) {
  const root = document.documentElement;
  for (const c of categories) {
    root.dataset[`consent${c.id[0].toUpperCase()}${c.id.slice(1)}`] = record?.choices[c.id] === true ? '1' : '0';
  }
  document.dispatchEvent(new CustomEvent('lp:consent-changed', { detail: record }));
}

export default function ConsentManager({ categories, version }: Props) {
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [banner, setBanner] = useState(false);
  const [draft, setDraft] = useState<Partial<Record<ConsentCategory, boolean>>>({});
  const [saved, setSaved] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const active = activeCategories(categories);

  const storage = () => {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  };

  const commit = (choices: Partial<Record<ConsentCategory, boolean>>, source: ConsentRecord['source'] = 'user') => {
    const rec = makeRecord(choices, version, source);
    writeConsent(storage(), rec);
    setRecord(rec);
    setDraft({ ...rec.choices });
    publish(rec, categories);
    setBanner(false);
    return rec;
  };

  const openDialog = (opener?: HTMLElement | null) => {
    openerRef.current = opener ?? (document.activeElement as HTMLElement | null);
    setDraft({ ...(record?.choices ?? {}) });
    setSaved('');
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
    openerRef.current?.focus?.();
  };

  useEffect(() => {
    const existing = readConsent(storage());
    setRecord(existing);
    setDraft({ ...(existing?.choices ?? {}) });
    setHydrated(true);

    if (needsPrompt(existing, categories, version)) {
      if (gpcEnabled(navigator as unknown as { globalPrivacyControl?: boolean })) {
        commit(allChoices(categories, false), 'gpc');
      } else {
        setBanner(true);
      }
    } else {
      publish(existing, categories);
    }

    const onOpen = (event: Event) => {
      event.preventDefault();
      openDialog(event.currentTarget as HTMLElement);
    };
    const openers = Array.from(document.querySelectorAll<HTMLElement>('[data-open-consent]'));
    openers.forEach((el) => el.addEventListener('click', onOpen));
    const onCustom = () => openDialog(null);
    document.addEventListener('lp:open-consent', onCustom);
    return () => {
      openers.forEach((el) => el.removeEventListener('click', onOpen));
      document.removeEventListener('lp:open-consent', onCustom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = () => {
    commit(draft);
    setSaved('Saved. You can change this any time from the footer.');
    window.setTimeout(closeDialog, 600);
  };

  return (
    <div data-consent data-hydrated={hydrated ? 'true' : undefined}>
      {banner && (
        <section class="consent-banner" role="region" aria-label="Privacy choices">
          <h2>Can we count your visit?</h2>
          <p>
            LaunchPad sets no cookies and builds no profile. Optional: anonymous usage counts and
            videos from other sites. Nothing optional runs until you choose.
          </p>
          <div class="btn-row">
            <button type="button" class="btn btn-secondary btn-sm" onClick={() => commit(allChoices(categories, false))}>
              Reject all
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onClick={() => commit(allChoices(categories, true))}>
              Accept all
            </button>
            <button type="button" class="btn btn-link btn-sm" onClick={(e) => openDialog(e.currentTarget as HTMLElement)}>
              Choose
            </button>
          </div>
        </section>
      )}

      <dialog class="consent-dialog" ref={dialogRef} aria-labelledby="consent-title" onClose={() => openerRef.current?.focus?.()}>
        <form method="dialog" class="consent-dialog-inner" onSubmit={(e) => e.preventDefault()}>
          <h2 id="consent-title">Privacy choices</h2>
          <p>
            LaunchPad uses no cookies. Your browser keeps a few preferences so the site works;
            those stay on your device and never reach us.
          </p>

          <ul class="consent-list">
            {NECESSARY.map((n) => (
              <li class="consent-item">
                <div>
                  <strong>
                    <code>{n.key}</code>
                  </strong>
                  <p class="hint">{n.what}</p>
                </div>
                <span class="consent-state">Always on</span>
              </li>
            ))}
            {categories.map((c) => (
              <li class="consent-item">
                <div>
                  <strong>
                    <label for={`consent-${c.id}`}>{c.label}</label>
                  </strong>
                  <p class="hint">{c.description}</p>
                </div>
                {c.active ? (
                  <input
                    id={`consent-${c.id}`}
                    class="switch"
                    type="checkbox"
                    role="switch"
                    checked={draft[c.id] === true}
                    onChange={(e) => setDraft({ ...draft, [c.id]: (e.currentTarget as HTMLInputElement).checked })}
                  />
                ) : (
                  <span class="consent-state" id={`consent-${c.id}`}>Not in use</span>
                )}
              </li>
            ))}
          </ul>

          <p class="hint" role="status" aria-live="polite">
            {saved}
          </p>

          <div class="consent-actions">
            <button type="button" class="btn btn-link" onClick={closeDialog}>
              Close
            </button>
            {active.length > 0 && (
              <button type="button" class="btn btn-secondary" onClick={() => { setDraft(allChoices(categories, false)); commit(allChoices(categories, false)); setSaved('Everything optional is off.'); }}>
                Reject all
              </button>
            )}
            <button type="button" class="btn" onClick={saveDraft} disabled={active.length === 0}>
              Save choices
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
