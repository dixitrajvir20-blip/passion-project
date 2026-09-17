/**
 * Local-first progress. Everything stays in the browser; the "sync code" is the whole
 * progress record encoded so it can be pasted on another device. No server, no account.
 */

/** Leitner box: 1 comes back tomorrow, 5 comes back in a month. */
export type Box = 1 | 2 | 3 | 4 | 5;

export interface ReviewItem {
  box: Box;
  /** ISO date-time the check comes back. */
  due: string;
}

export interface Progress {
  v: 1;
  /** Lesson or tool ids, e.g. "in/money-basics/first-earnings". */
  done: string[];
  /** Quiz results, keyed by lesson id: correct answers out of total. */
  quiz: Record<string, { correct: number; total: number; at: string }>;
  /**
   * Spaced review, keyed per check ("in/money-basics/upi-scam#q2"), not per lesson: a reader
   * who misses one question should meet that question again, not the whole quiz. Optional so
   * sync codes made before reviews existed still import. Only {box, due} is kept: no attempt
   * log, no record of when someone studied.
   */
  review?: Record<string, ReviewItem>;
  updatedAt: string;
}

export const PROGRESS_KEY = 'lp:progress';

/** Days until a check returns, by box. Simple Leitner does as well as fancier schedules. */
export const BOX_DAYS: Record<Box, number> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LESSONS = 5000;
const MAX_ID_LENGTH = 200;

export function emptyProgress(now: Date = new Date()): Progress {
  return { v: 1, done: [], quiz: {}, updatedAt: now.toISOString() };
}

function isQuizResult(value: unknown): value is Progress['quiz'][string] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.correct === 'number' && Number.isFinite(r.correct) &&
    typeof r.total === 'number' && Number.isFinite(r.total) &&
    typeof r.at === 'string'
  );
}

function isReviewItem(value: unknown): value is ReviewItem {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.box === 'number' && Number.isInteger(r.box) && r.box >= 1 && r.box <= 5 &&
    typeof r.due === 'string' && !Number.isNaN(Date.parse(r.due))
  );
}

/**
 * Stored values and pasted sync codes are untrusted (docs/SECURITY.md, risk 11), so this checks
 * the whole shape, not just the top level: `typeof null` and `typeof []` are both 'object', and
 * either one in `quiz` would throw inside merge().
 */
export function isProgress(value: unknown): value is Progress {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const p = value as Record<string, unknown>;
  if (p.v !== 1 || typeof p.updatedAt !== 'string') return false;
  if (!Array.isArray(p.done) || p.done.length > MAX_LESSONS) return false;
  if (!p.done.every((id) => typeof id === 'string' && id.length <= MAX_ID_LENGTH)) return false;
  if (typeof p.quiz !== 'object' || p.quiz === null || Array.isArray(p.quiz)) return false;
  const entries = Object.entries(p.quiz as Record<string, unknown>);
  if (entries.length > MAX_LESSONS) return false;
  if (!entries.every(([id, result]) => id.length <= MAX_ID_LENGTH && isQuizResult(result))) return false;
  if (p.review === undefined) return true;
  if (typeof p.review !== 'object' || p.review === null || Array.isArray(p.review)) return false;
  const items = Object.entries(p.review as Record<string, unknown>);
  if (items.length > MAX_LESSONS * 10) return false;
  return items.every(([id, item]) => id.length <= MAX_ID_LENGTH && isReviewItem(item));
}

export function markDone(progress: Progress, id: string, now: Date = new Date()): Progress {
  if (progress.done.includes(id)) return progress;
  return { ...progress, done: [...progress.done, id], updatedAt: now.toISOString() };
}

export function recordQuiz(
  progress: Progress,
  lessonId: string,
  correct: number,
  total: number,
  now: Date = new Date(),
): Progress {
  const at = now.toISOString();
  return { ...progress, quiz: { ...progress.quiz, [lessonId]: { correct, total, at } }, updatedAt: at };
}

/** A right answer moves the check one box up; a miss sends it back to tomorrow. */
export function schedule(progress: Progress, itemId: string, correct: boolean, now: Date = new Date()): Progress {
  const current = progress.review?.[itemId]?.box ?? 0;
  const box = (correct ? Math.min(5, current + 1) : 1) as Box;
  const due = new Date(now.getTime() + BOX_DAYS[box] * DAY_MS).toISOString();
  return {
    ...progress,
    review: { ...(progress.review ?? {}), [itemId]: { box, due } },
    updatedAt: now.toISOString(),
  };
}

/** Checks ready now, longest-waiting first, capped so a review is a minute, not a backlog. */
export function readyItems(progress: Progress, now: Date = new Date(), cap = 10): string[] {
  const limit = now.getTime();
  return Object.entries(progress.review ?? {})
    .filter(([, item]) => Date.parse(item.due) <= limit)
    .sort((a, b) => Date.parse(a[1].due) - Date.parse(b[1].due))
    .slice(0, cap)
    .map(([id]) => id);
}

/** The next moment anything comes back, or null when nothing is scheduled. */
export function nextReturn(progress: Progress, prefix = ''): Date | null {
  const times = Object.entries(progress.review ?? {})
    .filter(([id]) => id.startsWith(prefix))
    .map(([, item]) => Date.parse(item.due));
  return times.length ? new Date(Math.min(...times)) : null;
}

/**
 * Union of two records: done lists merge, the newer quiz result per lesson wins, and for a
 * check on both devices the lower box wins (then the earlier date). Too much review is a minor
 * cost; silently skipping it is the failure spaced practice exists to prevent.
 */
export function merge(a: Progress, b: Progress): Progress {
  const done = Array.from(new Set([...a.done, ...b.done]));
  const quiz: Progress['quiz'] = { ...a.quiz };
  for (const [id, result] of Object.entries(b.quiz)) {
    if (!quiz[id] || quiz[id].at < result.at) quiz[id] = result;
  }
  const review: Record<string, ReviewItem> = { ...(a.review ?? {}) };
  for (const [id, item] of Object.entries(b.review ?? {})) {
    const mine = review[id];
    if (!mine || item.box < mine.box || (item.box === mine.box && item.due < mine.due)) review[id] = item;
  }
  const updatedAt = a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt;
  const merged: Progress = { v: 1, done, quiz, updatedAt };
  if (Object.keys(review).length > 0) merged.review = review;
  return merged;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const padded = code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** "LP1." prefix so a pasted code is recognisable and versioned. */
export function exportCode(progress: Progress): string {
  return 'LP1.' + toBase64Url(JSON.stringify(progress));
}

export function importCode(code: string): Progress | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith('LP1.')) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(trimmed.slice(4)));
    return isProgress(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadProgress(storage: StorageLike | undefined): Progress {
  try {
    const raw = storage?.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    return isProgress(parsed) ? parsed : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(storage: StorageLike | undefined, progress: Progress): boolean {
  try {
    storage?.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
