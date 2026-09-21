import { describe, expect, it } from 'vitest';
import { addSeconds, emptyActivity, formatClock, formatDuration, isActivity, lastDays, loadActivity, totalSeconds } from '../../src/lib/activity';

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 15, 30);

describe('learning time', () => {
  it('adds seconds to today and keeps other days', () => {
    let a = addSeconds(emptyActivity(), 15, at(2026, 9, 19));
    a = addSeconds(a, 15, at(2026, 9, 19));
    a = addSeconds(a, 60, at(2026, 9, 20));
    expect(a.days['2026-09-19']).toBe(30);
    expect(a.days['2026-09-20']).toBe(60);
    expect(totalSeconds(a)).toBe(90);
  });

  it('forgets days older than ninety days', () => {
    let a = addSeconds(emptyActivity(), 10, at(2026, 1, 1));
    a = addSeconds(a, 10, at(2026, 9, 19));
    expect(a.days['2026-01-01']).toBeUndefined();
    expect(Object.keys(a.days)).toEqual(['2026-09-19']);
  });

  it('never records more than a day in a day', () => {
    const a = addSeconds(emptyActivity(), 200_000, at(2026, 9, 19));
    expect(a.days['2026-09-19']).toBe(86_400);
  });

  it('lists the last seven days oldest first with zeros filled in', () => {
    const a = addSeconds(emptyActivity(), 120, at(2026, 9, 17));
    const week = lastDays(a, 7, at(2026, 9, 19));
    expect(week).toHaveLength(7);
    expect(week[0].day).toBe('2026-09-13');
    expect(week[6].day).toBe('2026-09-19');
    expect(week.map((d) => d.seconds)).toEqual([0, 0, 0, 0, 120, 0, 0]);
  });

  it('treats a tampered record as empty', () => {
    expect(isActivity({ v: 1, days: { '2026-09-19': -5 } })).toBe(false);
    expect(isActivity({ v: 1, days: { 'not a day': 5 } })).toBe(false);
    expect(isActivity({ v: 1, days: [] })).toBe(false);
    expect(isActivity({ v: 2, days: {} })).toBe(false);
    const storage = { getItem: () => '{"v":1,"days":{"2026-09-19":"lots"}}', setItem() {}, removeItem() {} };
    expect(loadActivity(storage)).toEqual(emptyActivity());
  });

  it('formats durations the way a stat card needs them', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(59 * 60)).toBe('59 min');
    expect(formatDuration(3905)).toBe('1 h 05 min');
    expect(formatClock(3661)).toBe('1:01:01');
  });
});
