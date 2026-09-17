import { describe, it, expect } from 'vitest';
import {
  CONSENT_KEY,
  allChoices,
  gpcEnabled,
  isAllowed,
  makeRecord,
  needsPrompt,
  readConsent,
  writeConsent,
  type CategoryDef,
} from '../../src/lib/consent';

const defs: CategoryDef[] = [
  { id: 'analytics', label: 'Usage statistics', description: '', active: true },
  { id: 'embeds', label: 'Videos', description: '', active: false },
];

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe('consent', () => {
  it('never prompts when nothing optional is active', () => {
    const inactive = defs.map((d) => ({ ...d, active: false }));
    expect(needsPrompt(null, inactive, 1)).toBe(false);
  });

  it('prompts when an active category has no stored choice', () => {
    expect(needsPrompt(null, defs, 1)).toBe(true);
    const partial = makeRecord({ embeds: true }, 1);
    expect(needsPrompt(partial, defs, 1)).toBe(true);
  });

  it('prompts again when the policy version moves on', () => {
    const old = makeRecord({ analytics: true }, 1);
    expect(needsPrompt(old, defs, 2)).toBe(true);
    expect(needsPrompt(old, defs, 1)).toBe(false);
  });

  it('treats anything but an explicit true as no', () => {
    expect(isAllowed(null, 'analytics', defs)).toBe(false);
    expect(isAllowed(makeRecord({}, 1), 'analytics', defs)).toBe(false);
    expect(isAllowed(makeRecord({ analytics: true }, 1), 'analytics', defs)).toBe(true);
    // Inactive categories are never allowed even if a stale record says yes.
    expect(isAllowed(makeRecord({ embeds: true }, 1), 'embeds', defs)).toBe(false);
  });

  it('round-trips through storage and survives garbage', () => {
    const storage = memoryStorage();
    const rec = makeRecord(allChoices(defs, false), 1);
    expect(writeConsent(storage, rec)).toBe(true);
    expect(readConsent(storage)).toEqual(rec);
    storage.setItem(CONSENT_KEY, '{not json');
    expect(readConsent(storage)).toBeNull();
    storage.setItem(CONSENT_KEY, JSON.stringify({ v: 'x' }));
    expect(readConsent(storage)).toBeNull();
  });

  it('rejects a tampered record rather than letting it crash the dialog', () => {
    const storage = memoryStorage();
    const good = { v: 1, at: '2026-09-17T00:00:00Z', source: 'user', choices: { analytics: false } };
    for (const bad of [
      { ...good, choices: null },
      { ...good, choices: [] },
      { ...good, choices: { analytics: 'yes' } },
      { ...good, source: 'someone-else' },
    ]) {
      storage.setItem(CONSENT_KEY, JSON.stringify(bad));
      expect(readConsent(storage)).toBeNull();
    }
    storage.setItem(CONSENT_KEY, JSON.stringify(good));
    expect(readConsent(storage)).toEqual(good);
  });

  it('only builds choices for active categories', () => {
    expect(allChoices(defs, true)).toEqual({ analytics: true });
  });

  it('reads the Global Privacy Control signal', () => {
    expect(gpcEnabled({ globalPrivacyControl: true })).toBe(true);
    expect(gpcEnabled({})).toBe(false);
    expect(gpcEnabled(undefined)).toBe(false);
  });
});
