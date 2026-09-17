import { describe, it, expect } from 'vitest';
import { emptyProgress, exportCode, importCode, isProgress, markDone, merge } from '../../src/lib/progress';

describe('progress', () => {
  it('marks a lesson done once', () => {
    const p = markDone(markDone(emptyProgress(), 'in/a'), 'in/a');
    expect(p.done).toEqual(['in/a']);
  });

  it('round-trips through a sync code', () => {
    const p = markDone(emptyProgress(new Date('2026-09-17T00:00:00Z')), 'us/credit-score');
    const code = exportCode(p);
    expect(code.startsWith('LP1.')).toBe(true);
    expect(importCode(code)).toEqual(p);
    expect(importCode(' ' + code + '\n')).toEqual(p);
  });

  it('rejects codes that are not ours', () => {
    expect(importCode('hello')).toBeNull();
    expect(importCode('LP1.not-base64!!')).toBeNull();
    expect(importCode('LP1.' + btoa('{"v":2}'))).toBeNull();
  });

  it('rejects a tampered record instead of crashing later in merge()', () => {
    const base = { v: 1, done: [], quiz: {}, updatedAt: '2026-01-01' };
    expect(isProgress(base)).toBe(true);
    expect(isProgress({ ...base, quiz: null })).toBe(false);
    expect(isProgress({ ...base, quiz: [] })).toBe(false);
    expect(isProgress({ ...base, quiz: { x: null } })).toBe(false);
    expect(isProgress({ ...base, quiz: { x: { correct: '3', total: 3, at: 'now' } } })).toBe(false);
    expect(isProgress({ ...base, done: [1, 2] })).toBe(false);
    expect(isProgress({ ...base, done: ['x'.repeat(201)] })).toBe(false);
    expect(isProgress({ ...base, done: Array.from({ length: 5001 }, (_, i) => `l${i}`) })).toBe(false);
    expect(isProgress([])).toBe(false);
  });

  it('refuses a sync code whose payload has the wrong shape', () => {
    const hostile = 'LP1.' + btoa(JSON.stringify({ v: 1, done: [], quiz: null, updatedAt: 'x' }));
    expect(importCode(hostile)).toBeNull();
  });

  it('merges without losing anything and keeps the newer quiz result', () => {
    const a = { ...emptyProgress(), done: ['x'], quiz: { x: { correct: 1, total: 3, at: '2026-01-01' } }, updatedAt: '2026-01-01' };
    const b = { ...emptyProgress(), done: ['y'], quiz: { x: { correct: 3, total: 3, at: '2026-02-01' } }, updatedAt: '2026-02-01' };
    const m = merge(a, b);
    expect(m.done.sort()).toEqual(['x', 'y']);
    expect(m.quiz.x.correct).toBe(3);
    expect(m.updatedAt).toBe('2026-02-01');
  });
});
