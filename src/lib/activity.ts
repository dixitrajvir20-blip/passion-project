/**
 * Learning time, kept on the device as seconds per calendar day. Recorded only after the reader
 * says yes in Privacy choices (the "stats" category), read only by the dashboard, and never
 * sent anywhere. Calendar days, not timestamps: on a shared phone the hour someone studied is
 * nobody else's business. Ninety days are kept; older days fall away.
 */
import { dayString } from './progress';

export interface Activity {
  v: 1;
  /** YYYY-MM-DD (local) → seconds spent with a page of the site visible. */
  days: Record<string, number>;
}

export const ACTIVITY_KEY = 'lp:activity';
const KEEP_DAYS = 90;
const DAY_SECONDS = 24 * 60 * 60;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function emptyActivity(): Activity {
  return { v: 1, days: {} };
}

export function isActivity(value: unknown): value is Activity {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.v !== 1) return false;
  if (typeof v.days !== 'object' || v.days === null || Array.isArray(v.days)) return false;
  const entries = Object.entries(v.days as Record<string, unknown>);
  if (entries.length > KEEP_DAYS * 2) return false;
  return entries.every(
    ([day, seconds]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0 && seconds <= DAY_SECONDS,
  );
}

export function loadActivity(storage: StorageLike | undefined): Activity {
  try {
    const raw = storage?.getItem(ACTIVITY_KEY);
    if (!raw) return emptyActivity();
    const parsed = JSON.parse(raw);
    return isActivity(parsed) ? parsed : emptyActivity();
  } catch {
    return emptyActivity();
  }
}

export function saveActivity(storage: StorageLike | undefined, activity: Activity): boolean {
  try {
    storage?.setItem(ACTIVITY_KEY, JSON.stringify(activity));
    return true;
  } catch {
    return false;
  }
}

export function clearActivity(storage: StorageLike | undefined): void {
  try {
    storage?.removeItem(ACTIVITY_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Adds seconds to today's total and drops days older than the window. */
export function addSeconds(activity: Activity, seconds: number, now: Date = new Date()): Activity {
  const today = dayString(now);
  const days: Record<string, number> = {};
  const cutoff = dayString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (KEEP_DAYS - 1)));
  for (const [day, value] of Object.entries(activity.days)) if (day >= cutoff) days[day] = value;
  days[today] = Math.min(DAY_SECONDS, (days[today] ?? 0) + Math.max(0, seconds));
  return { v: 1, days };
}

/** The last `count` days ending today, oldest first, with zero for days that have nothing. */
export function lastDays(activity: Activity, count: number, now: Date = new Date()): { day: string; seconds: number }[] {
  const out: { day: string; seconds: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const day = dayString(date);
    out.push({ day, seconds: activity.days[day] ?? 0 });
  }
  return out;
}

export function totalSeconds(activity: Activity): number {
  return Object.values(activity.days).reduce((sum, value) => sum + value, 0);
}

/** "1 h 05 min", "12 min", "45 s": short, for a stat card. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** "0:12:34", for a running counter. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
