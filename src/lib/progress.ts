/**
 * Local-first progress. Everything stays in the browser; the "sync code" is the whole
 * progress record encoded so it can be pasted on another device. No server, no account.
 */

export interface Progress {
  v: 1;
  /** Lesson or tool ids, e.g. "in/money-basics/first-earnings". */
  done: string[];
  /** Quiz results, keyed by lesson id: correct answers out of total. */
  quiz: Record<string, { correct: number; total: number; at: string }>;
  updatedAt: string;
}

export const PROGRESS_KEY = 'lp:progress';

export function emptyProgress(now: Date = new Date()): Progress {
  return { v: 1, done: [], quiz: {}, updatedAt: now.toISOString() };
}

const MAX_LESSONS = 5000;
const MAX_ID_LENGTH = 200;

function isQuizResult(value: unknown): value is Progress['quiz'][string] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.correct === 'number' && Number.isFinite(r.correct) &&
    typeof r.total === 'number' && Number.isFinite(r.total) &&
    typeof r.at === 'string'
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
  return entries.every(([id, result]) => id.length <= MAX_ID_LENGTH && isQuizResult(result));
}

export function markDone(progress: Progress, id: string, now: Date = new Date()): Progress {
  if (progress.done.includes(id)) return progress;
  return { ...progress, done: [...progress.done, id], updatedAt: now.toISOString() };
}

/** Union of two records: done lists merge, the newer quiz result per lesson wins. */
export function merge(a: Progress, b: Progress): Progress {
  const done = Array.from(new Set([...a.done, ...b.done]));
  const quiz: Progress['quiz'] = { ...a.quiz };
  for (const [id, result] of Object.entries(b.quiz)) {
    if (!quiz[id] || quiz[id].at < result.at) quiz[id] = result;
  }
  const updatedAt = a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt;
  return { v: 1, done, quiz, updatedAt };
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
