import { describe, it, expect } from 'vitest';
import {
  BOX_DAYS,
  dayString,
  emptyProgress,
  exportCode,
  importCode,
  isProgress,
  markDone,
  merge,
  nextReturn,
  nextReturnAmong,
  readyItems,
  recordQuiz,
  schedule,
} from '../../src/lib/progress';

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

  describe('spaced review', () => {
    const t0 = new Date('2026-09-17T09:00:00Z');
    const days = (n: number) => new Date(t0.getTime() + n * 86_400_000);

    it('a first right answer comes back tomorrow, then at widening gaps', () => {
      let p = schedule(emptyProgress(t0), 'in/a#q1', true, t0);
      expect(p.review!['in/a#q1']).toEqual({ box: 1, due: dayString(days(1)) });
      p = schedule(p, 'in/a#q1', true, days(1));
      expect(p.review!['in/a#q1'].box).toBe(2);
      expect(p.review!['in/a#q1'].due).toBe(dayString(days(1 + BOX_DAYS[2])));
    });

    it('a miss goes back to tomorrow however far it had climbed', () => {
      let p = emptyProgress(t0);
      for (let i = 0; i < 4; i++) p = schedule(p, 'x#q1', true, t0);
      expect(p.review!['x#q1'].box).toBe(4);
      p = schedule(p, 'x#q1', false, t0);
      expect(p.review!['x#q1']).toEqual({ box: 1, due: dayString(days(1)) });
    });

    it('never climbs past the monthly box', () => {
      let p = emptyProgress(t0);
      for (let i = 0; i < 9; i++) p = schedule(p, 'x#q1', true, t0);
      expect(p.review!['x#q1'].box).toBe(5);
    });

    it('offers only what is ready, longest-waiting first, and caps the list', () => {
      let p = emptyProgress(t0);
      p = schedule(p, 'late#q1', true, days(-5)); // came back 4 days ago
      p = schedule(p, 'recent#q1', true, days(-1)); // came back today
      p = schedule(p, 'future#q1', true, t0); // tomorrow
      expect(readyItems(p, t0)).toEqual(['late#q1', 'recent#q1']);
      for (let i = 0; i < 20; i++) p = schedule(p, `bulk#q${i}`, true, days(-3));
      expect(readyItems(p, t0)).toHaveLength(10);
    });

    it('reports when the next check returns, optionally for one lesson', () => {
      let p = schedule(emptyProgress(t0), 'in/a#q1', true, t0);
      p = schedule(p, 'in/b#q1', true, days(2));
      expect(dayString(nextReturn(p)!)).toBe(dayString(days(1)));
      expect(dayString(nextReturn(p, 'in/b#')!)).toBe(dayString(days(3)));
      expect(nextReturn(emptyProgress(t0))).toBeNull();
    });

    it('keeps the lower box when two devices disagree, so review is never skipped', () => {
      const a = schedule(schedule(emptyProgress(t0), 'x#q1', true, t0), 'x#q1', true, t0); // box 2
      const b = schedule(emptyProgress(t0), 'x#q1', false, t0); // box 1
      expect(merge(a, b).review!['x#q1'].box).toBe(1);
      expect(merge(b, a).review!['x#q1'].box).toBe(1);
    });

    it('still imports a sync code made before reviews existed', () => {
      const old = { v: 1, done: ['in/a'], quiz: {}, updatedAt: '2026-01-01T00:00:00Z' };
      const code = 'LP1.' + btoa(JSON.stringify(old));
      expect(importCode(code)).toEqual(old);
      expect(merge(importCode(code)!, emptyProgress(t0)).review).toBeUndefined();
    });

    it('rejects a review record with an impossible box or a date that is not one', () => {
      const base = { v: 1, done: [], quiz: {}, updatedAt: 'x' };
      expect(isProgress({ ...base, review: { 'a#q1': { box: 3, due: '2026-09-20T00:00:00Z' } } })).toBe(true);
      expect(isProgress({ ...base, review: { 'a#q1': { box: 9, due: '2026-09-20T00:00:00Z' } } })).toBe(false);
      expect(isProgress({ ...base, review: { 'a#q1': { box: 1, due: 'soon' } } })).toBe(false);
      expect(isProgress({ ...base, review: [] })).toBe(false);
    });

    it('records a quiz result without touching the done list', () => {
      const p = recordQuiz(emptyProgress(t0), 'in/a', 2, 3, t0);
      expect(p.quiz['in/a']).toEqual({ correct: 2, total: 3, at: dayString(t0) });
      expect(p.done).toEqual([]);
    });
  });

  it('keeps calendar days, never the time of day someone studied', () => {
    const late = new Date(2026, 8, 17, 23, 47);
    const p = recordQuiz(schedule(emptyProgress(late), 'in/a#q1', true, late), 'in/a', 1, 1, late);
    const text = JSON.stringify(p);
    expect(text).not.toMatch(/T\d\d:\d\d/);
    expect(p.review!['in/a#q1'].due).toBe('2026-09-18');
    expect(p.quiz['in/a'].at).toBe('2026-09-17');
  });

  it('still reads review dates written as full timestamps by older versions', () => {
    const old = { v: 1 as const, done: [], quiz: {}, updatedAt: '2026-09-01T10:00:00Z', review: { 'a#q1': { box: 1 as const, due: '2026-09-02T10:00:00.000Z' } } };
    expect(readyItems(old, new Date(2026, 8, 3))).toEqual(['a#q1']);
    expect(dayString(nextReturn(old)!)).toBe('2026-09-02');
  });
});

describe('nextReturnAmong', () => {
  it('returns the earliest day among the given checks only', () => {
    const now = new Date(2026, 8, 22);
    let p = schedule(emptyProgress(now), 'in/protect-your-money/upi-fraud-and-the-clock#d1', false, now); // box 1, back tomorrow
    p = schedule(p, 'in/tools/spot-the-fake#kyc-link', true, now); // box 1 too
    p = schedule(p, 'in/tools/spot-the-fake#kyc-link', true, now); // box 2, three days
    p = schedule(p, 'us/other#q1', false, new Date(2026, 8, 1)); // earlier, but not asked about
    const back = nextReturnAmong(p, ['in/tools/spot-the-fake#kyc-link', 'in/protect-your-money/upi-fraud-and-the-clock#d1']);
    expect(dayString(back!)).toBe('2026-09-23');
    expect(dayString(nextReturnAmong(p, ['in/tools/spot-the-fake#kyc-link'])!)).toBe('2026-09-25');
  });

  it('is null for an empty list or ids never scheduled', () => {
    const p = schedule(emptyProgress(), 'a#d1', true);
    expect(nextReturnAmong(p, [])).toBeNull();
    expect(nextReturnAmong(p, ['b#d1'])).toBeNull();
    expect(nextReturnAmong(emptyProgress(), ['a#d1'])).toBeNull();
  });
});
