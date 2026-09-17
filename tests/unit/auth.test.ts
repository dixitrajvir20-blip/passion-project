import { describe, it, expect } from 'vitest';
import { ageDecision, ageFromBirthYear, isCompleteCode, isValidEmail, normaliseCode } from '../../src/lib/auth/validate';
import { createPreviewProvider } from '../../src/lib/auth/provider';

const NOW = new Date('2026-09-17T12:00:00Z');

describe('validate', () => {
  it('accepts ordinary emails and rejects junk', () => {
    expect(isValidEmail('priya@example.com')).toBe(true);
    expect(isValidEmail('  priya@example.co.in ')).toBe(true);
    expect(isValidEmail('priya')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('normalises pasted codes', () => {
    expect(normaliseCode('123 456')).toBe('123456');
    expect(normaliseCode('12-34-56-78')).toBe('123456');
    expect(isCompleteCode('12345')).toBe(false);
    expect(isCompleteCode('123456')).toBe(true);
  });

  it('computes a conservative age from a birth year', () => {
    expect(ageFromBirthYear(2009, NOW)).toBe(16); // birthday may not have happened yet
    expect(ageFromBirthYear(2026, NOW)).toBe(-1);
    expect(ageFromBirthYear(2027, NOW)).toBeNull();
    expect(ageFromBirthYear(1800, NOW)).toBeNull();
    expect(ageFromBirthYear(NaN, NOW)).toBeNull();
  });

  it('applies the regional consent thresholds', () => {
    expect(ageDecision(16, 'in')).toBe('parent'); // DPDP: under 18 is a child
    expect(ageDecision(18, 'in')).toBe('self');
    expect(ageDecision(15, 'eu')).toBe('parent');
    expect(ageDecision(16, 'eu')).toBe('self');
    expect(ageDecision(13, 'uk')).toBe('self');
    expect(ageDecision(13, 'us')).toBe('self');
    expect(ageDecision(12, 'us')).toBe('none'); // COPPA: no accounts under 13
    expect(ageDecision(null, 'us')).toBe('none');
  });
});

describe('preview provider', () => {
  it('issues a code and accepts it once', async () => {
    const p = createPreviewProvider();
    const sent = await p.requestCode('Priya@Example.com');
    expect(sent.ok).toBe(true);
    const code = sent.ok ? sent.previewCode! : '';
    expect(code).toMatch(/^\d{6}$/);
    const ok = await p.verifyCode('priya@example.com', code);
    expect(ok.ok).toBe(true);
    const again = await p.verifyCode('priya@example.com', code);
    expect(again.ok).toBe(false);
  });

  it('rejects a wrong code and locks after five attempts', async () => {
    const p = createPreviewProvider();
    const sent = await p.requestCode('a@example.com');
    const code = sent.ok ? sent.previewCode! : '';
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await p.verifyCode('a@example.com', wrong);
      expect(r.ok).toBe(false);
    }
    const locked = await p.verifyCode('a@example.com', code);
    expect(locked.ok).toBe(false);
  });
});
