/**
 * Consent logic, kept free of the DOM so it can be unit-tested.
 * Design follows the EDPB cookie-banner taskforce report (Jan 2023) and CNIL guidance:
 * nothing optional runs before a choice, "reject all" is as easy as "accept all",
 * the choice is versioned and can be changed later, and Global Privacy Control is honoured.
 */

export type ConsentCategory = 'analytics' | 'embeds';

export interface ConsentRecord {
  v: number;
  at: string;
  source: 'user' | 'gpc';
  choices: Partial<Record<ConsentCategory, boolean>>;
}

export interface CategoryDef {
  id: ConsentCategory;
  label: string;
  description: string;
  active: boolean;
}

export const CONSENT_KEY = 'lp:consent';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readConsent(storage: StorageLike | undefined): ConsentRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (typeof parsed.v !== 'number') return null;
    // typeof null and typeof [] are both 'object'; either would crash the island on read.
    if (typeof parsed.choices !== 'object' || parsed.choices === null || Array.isArray(parsed.choices)) return null;
    if (parsed.source !== 'user' && parsed.source !== 'gpc') return null;
    for (const value of Object.values(parsed.choices)) if (typeof value !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(storage: StorageLike | undefined, record: ConsentRecord): boolean {
  if (!storage) return false;
  try {
    storage.setItem(CONSENT_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearConsent(storage: StorageLike | undefined): void {
  try {
    storage?.removeItem(CONSENT_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function activeCategories(defs: CategoryDef[]): CategoryDef[] {
  return defs.filter((d) => d.active);
}

/** A prompt is needed only when something optional exists and no current-version choice is stored. */
export function needsPrompt(record: ConsentRecord | null, defs: CategoryDef[], version: number): boolean {
  const active = activeCategories(defs);
  if (active.length === 0) return false;
  if (!record) return true;
  if (record.v < version) return true;
  return active.some((d) => typeof record.choices[d.id] !== 'boolean');
}

export function makeRecord(
  choices: Partial<Record<ConsentCategory, boolean>>,
  version: number,
  source: ConsentRecord['source'] = 'user',
  now: Date = new Date(),
): ConsentRecord {
  return { v: version, at: now.toISOString(), source, choices: { ...choices } };
}

export function allChoices(defs: CategoryDef[], value: boolean): Partial<Record<ConsentCategory, boolean>> {
  const out: Partial<Record<ConsentCategory, boolean>> = {};
  for (const d of activeCategories(defs)) out[d.id] = value;
  return out;
}

/** Global Privacy Control (navigator.globalPrivacyControl) counts as "reject all". */
export function gpcEnabled(nav: { globalPrivacyControl?: boolean } | undefined): boolean {
  return nav?.globalPrivacyControl === true;
}

/** Optional things run only on an explicit true. Unknown is no. */
export function isAllowed(record: ConsentRecord | null, category: ConsentCategory, defs: CategoryDef[]): boolean {
  const def = defs.find((d) => d.id === category);
  if (!def || !def.active) return false;
  return record?.choices[category] === true;
}
