/**
 * The dashboard reads what this device already keeps (lp:progress, lp:activity, lp:region) and
 * shows it plainly: four figures, learning time by day, the next lesson, progress per track, the
 * lessons finished lately. Boxes hold only figures (the four stats, the week chart, the ring, the
 * clock); the next lesson and the finished ones are ruled rows. Nothing here is sent anywhere; the
 * learning-time box says so, and links to Privacy choices where the recording can be switched off.
 */
import { useEffect, useState } from 'preact/hooks';
import { loadProgress, nextReturn, readyItems, type Progress } from '../lib/progress';
import { formatClock, formatDuration, lastDays, loadActivity, totalSeconds, type Activity } from '../lib/activity';
import { isAllowed, readConsent } from '../lib/consent';
import { consentCategories } from '../lib/site';
import './dashboard.css';

export interface CatalogueLesson {
  id: string;
  title: string;
  track: string;
  trackTitle: string;
  region: string;
  regionName: string;
  minutes: number;
  path: string;
}

interface Props {
  lessons: CatalogueLesson[];
  base: string;
  /** True once accounts are live; until then the sign-in link is a preview. */
  accounts?: boolean;
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/* The week chart's geometry, in user units. The viewBox is no wider than the chart's box at a
   320px screen (254px), so its 14px labels never render smaller than 14px; dashboard.css caps
   the growth. Seven 34-unit slots, 24-unit bars, room on the right for the word 'Today'. */
const CHART_W = 252;
const CHART_H = 132;
const SLOT = 34;
const BAR_W = 24;
const LEFT = 7;
const BASELINE = 104;
const BAR_MAX = 80;
const STUB = 4;

export default function Dashboard({ lessons, base, accounts = false }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [tracking, setTracking] = useState(false);
  const [savedRegion, setSavedRegion] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      storage = undefined;
    }
    const refresh = () => {
      setProgress(loadProgress(storage));
      setActivity(loadActivity(storage));
      setTracking(isAllowed(readConsent(storage), 'stats', consentCategories));
      try {
        setSavedRegion(storage?.getItem('lp:region') ?? null);
      } catch {
        setSavedRegion(null);
      }
      setNow(new Date());
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loaded = progress !== null;
  const done = new Set(progress?.done ?? []);
  const regionCodes = Array.from(new Set(lessons.map((l) => l.region)));
  const region = savedRegion && regionCodes.includes(savedRegion) ? savedRegion : regionCodes[0];
  const regionName = lessons.find((l) => l.region === region)?.regionName ?? '';
  const inRegion = lessons.filter((l) => l.region === region);
  const doneInRegion = inRegion.filter((l) => done.has(l.id));
  const doneAll = lessons.filter((l) => done.has(l.id));

  const quiz = progress?.quiz ?? {};
  let correct = 0;
  let answered = 0;
  for (const l of lessons) {
    const q = quiz[l.id];
    if (q) {
      correct += q.correct;
      answered += q.total;
    }
  }
  const ready = progress ? readyItems(progress, now).length : 0;
  const returns = progress ? nextReturn(progress) : null;
  const week = activity ? lastDays(activity, 7, now) : Array.from({ length: 7 }, () => ({ day: '', seconds: 0 }));
  const weekSeconds = week.reduce((sum, d) => sum + d.seconds, 0);
  const todaySeconds = week[6].seconds;
  const allSeconds = activity ? totalSeconds(activity) : 0;
  const maxSeconds = Math.max(60, ...week.map((d) => d.seconds));

  const next = [...inRegion, ...lessons.filter((l) => l.region !== region)].find((l) => !done.has(l.id));
  const tracks = Array.from(new Map(inRegion.map((l) => [l.track, l.trackTitle])).entries()).map(([track, title]) => {
    const all = inRegion.filter((l) => l.track === track);
    return { track, title, total: all.length, done: all.filter((l) => done.has(l.id)).length };
  });
  const share = inRegion.length ? doneInRegion.length / inRegion.length : 0;
  const recent = [...(progress?.done ?? [])]
    .reverse()
    .map((id) => lessons.find((l) => l.id === id))
    .filter((l): l is CatalogueLesson => l !== undefined)
    .slice(0, 5);
  const dateFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  // The seventh bar is today: it is named in words, not only by its colour.
  const weekLabels = week.map((d, i) => (i === 6 ? 'Today' : d.day ? DAY_LETTERS[new Date(d.day + 'T12:00').getDay()] : ''));
  const circumference = 2 * Math.PI * 44;

  const openChoices = () => document.dispatchEvent(new CustomEvent('lp:open-consent'));

  return (
    <div class="dash" data-loaded={loaded ? 'true' : undefined}>
      <aside class="dash-side">
        <nav aria-label="Dashboard">
          <ul>
            <li><a href={`${base}/dashboard`} aria-current="page">Dashboard</a></li>
            <li><a href={`${base}/${region}/learn`}>Lessons</a></li>
            <li><a href={`${base}/${region}/tools`}>Calculators</a></li>
            <li><a href={`${base}/${region}/review`}>Review</a></li>
            <li><button type="button" onClick={openChoices}>Privacy choices</button></li>
            <li><a href={`${base}/account`}>{accounts ? 'Sign in' : 'Sign in (preview)'}</a></li>
          </ul>
        </nav>
      </aside>

      <div class="dash-main">
        <header class="dash-head">
          <div>
            <h1>Dashboard</h1>
            <p>Your learning, kept on this device. {regionName ? `${regionName} edition.` : ''}</p>
          </div>
          {next && <a class="btn" href={`${base}/${next.path}`}>Continue learning</a>}
        </header>

        <ul class="dash-stats">
          <li class="stat-card box">
            <span class="stat-name">Lessons completed</span>
            <strong class="stat-value numbers">{loaded ? `${doneInRegion.length} of ${inRegion.length}` : '–'}</strong>
            <span class="stat-note">{regionName} edition{doneAll.length > doneInRegion.length ? `, ${doneAll.length} in all` : ''}</span>
          </li>
          <li class="stat-card box">
            <span class="stat-name">Checks answered right</span>
            <strong class="stat-value numbers">{loaded ? correct : '–'}</strong>
            <span class="stat-note">{answered ? `of ${answered} answered` : 'No checks answered yet'}</span>
          </li>
          <li class="stat-card box">
            <span class="stat-name">Ready to review</span>
            <strong class="stat-value numbers">{loaded ? ready : '–'}</strong>
            <span class="stat-note">{returns ? `Next return ${dateFmt.format(returns)}` : 'Nothing scheduled yet'}</span>
          </li>
          <li class="stat-card box">
            <span class="stat-name">Learning time this week</span>
            <strong class="stat-value numbers">{loaded ? (tracking ? formatDuration(weekSeconds) : 'Off') : '–'}</strong>
            <span class="stat-note">{tracking ? `${formatDuration(allSeconds)} in the last 90 days` : 'Not recorded. Switch it on in Privacy choices.'}</span>
          </li>
        </ul>

        <div class="dash-grid">
          <section class="dash-card dash-rows wide" aria-labelledby="next-h">
            <h2 id="next-h">Next up</h2>
            {next ? (
              <ul class="index-list next-lesson">
                <li>
                  <a class="index-row" href={`${base}/${next.path}`}>
                    <span class="index-title">{next.title}</span>
                    <span class="index-meta dash-meta">{next.regionName} · {next.trackTitle} · {next.minutes} min</span>
                  </a>
                </li>
              </ul>
            ) : (
              <p class="dash-empty">Every lesson is done. New ones are on the way.</p>
            )}
          </section>

          <section class="dash-card box wide" aria-labelledby="week-h">
            <h2 id="week-h">This week</h2>
            <svg
              class="week-chart"
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              role="img"
              aria-label={`Learning time over the last seven days: ${formatDuration(weekSeconds)} in total, ${formatDuration(todaySeconds)} today.`}
            >
              {week.map((d, i) => {
                const h = d.seconds ? Math.max(STUB, Math.round((d.seconds / maxSeconds) * BAR_MAX)) : STUB;
                const x = LEFT + i * SLOT;
                const today = i === 6;
                return (
                  <g>
                    <rect class={`bar${d.seconds ? ' has-time' : ''}${today ? ' today' : ''}`} x={x} y={BASELINE - h} width={BAR_W} height={h} rx="2" />
                    {d.seconds > 0 && <text class="value" x={x + BAR_W / 2} y={BASELINE - h - 6}>{Math.round(d.seconds / 60)}</text>}
                    <text class={today ? 'label today' : 'label'} x={x + BAR_W / 2} y={BASELINE + 20}>{weekLabels[i]}</text>
                  </g>
                );
              })}
            </svg>
            <details class="week-table fold">
              <summary>The same numbers as a table</summary>
              <table class="table">
                <thead><tr><th scope="col">Day</th><th scope="col" class="num">Minutes</th></tr></thead>
                <tbody>{week.map((d) => <tr><td>{d.day || '–'}</td><td class="num">{Math.round(d.seconds / 60)}</td></tr>)}</tbody>
              </table>
            </details>
          </section>

          <section class="dash-card box" aria-labelledby="tracks-h">
            <h2 id="tracks-h">Progress by track</h2>
            <div class="ring-wrap">
              <svg class="ring" viewBox="0 0 100 100" role="img" aria-label={`${Math.round(share * 100)} percent of the ${regionName} lessons done`}>
                <circle class="track" cx="50" cy="50" r="44" />
                <circle class={`done ${share === 0 ? 'is-empty' : ''}`} cx="50" cy="50" r="44" stroke-dasharray={`${(circumference * share).toFixed(1)} ${circumference.toFixed(1)}`} />
                <text class="ring-value" x="50" y="50">{Math.round(share * 100)}%</text>
              </svg>
              <ul class="track-rows">
                {tracks.map((t) => (
                  <li><span>{t.title}</span><strong class="numbers">{t.done} / {t.total}</strong></li>
                ))}
              </ul>
            </div>
          </section>

          <section class="dash-card box timer" aria-labelledby="timer-h">
            <h2 id="timer-h">Learning time today</h2>
            <p class="clock numbers" aria-live="off">{tracking ? formatClock(todaySeconds) : '0:00:00'}</p>
            <p class="hint">
              {tracking
                ? 'Counts while a page of the site is open. Kept in this browser; never sent.'
                : 'Not being recorded. You can switch it on in Privacy choices.'}
            </p>
            <button type="button" class="btn btn-secondary" onClick={openChoices}>Privacy choices</button>
          </section>

          <section class="dash-card dash-rows wide" aria-labelledby="recent-h">
            <h2 id="recent-h">Recently completed</h2>
            {recent.length ? (
              <ul class="index-list recent">
                {recent.map((l) => (
                  <li>
                    <a class="index-row" href={`${base}/${l.path}`}>
                      <span class="index-title">{l.title}</span>
                      <span class="index-meta dash-meta">{quiz[l.id] ? `${quiz[l.id].correct} of ${quiz[l.id].total} right` : 'Read'}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p class="dash-empty">Nothing yet. Finish a lesson and it appears here.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
