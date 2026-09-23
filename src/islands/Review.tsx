import { useEffect, useState } from 'preact/hooks';
import { loadProgress, nextReturn, readyItems, saveProgress, schedule } from '../lib/progress';

interface Check {
  lesson: string;
  lessonPath: string;
  context?: string;
  q: string;
  options: { text: string; why: string }[];
  answer: number;
}

interface Props {
  region: string;
  checksUrl: string;
  base: string;
  localeCode: string;
}

type Item = { id: string; check: Check; picked: number | null; shown: boolean };

/** checks.json is ours, but a cached or truncated copy could be malformed. Skip anything that is. */
function isCheck(value: unknown): value is Check {
  if (!value || typeof value !== 'object') return false;
  const c = value as Check;
  return (
    typeof c.q === 'string' && typeof c.lesson === 'string' && typeof c.lessonPath === 'string' &&
    Array.isArray(c.options) && c.options.length >= 2 &&
    c.options.every((o) => o && typeof o.text === 'string' && typeof o.why === 'string') &&
    Number.isInteger(c.answer) && c.answer >= 0 && c.answer < c.options.length &&
    (c.context === undefined || typeof c.context === 'string')
  );
}

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * The one page that is an island by nature: what it shows exists only on this device. Up to ten
 * checks that are ready, mixed across lessons (mixing is what makes review harder and better than
 * re-reading one lesson). It never counts what is owed and never says "overdue".
 */
export default function Review({ region, checksUrl, base, localeCode }: Props) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [next, setNext] = useState<Date | null>(null);

  useEffect(() => {
    const progress = loadProgress(storage());
    const ready = readyItems(progress).filter((id) => id.startsWith(`${region}/`));
    setNext(nextReturn(progress, `${region}/`));
    if (ready.length === 0) {
      setItems([]);
      return;
    }
    fetch(checksUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((all: unknown) => {
        const checks = all && typeof all === 'object' ? (all as Record<string, unknown>) : {};
        // A check whose lesson was rewritten no longer exists; skip it rather than fail.
        setItems(
          ready
            .filter((id) => Object.hasOwn(checks, id) && isCheck(checks[id]))
            .map((id) => ({ id, check: checks[id] as Check, picked: null, shown: false })),
        );
      })
      .catch(() => setFailed(true));
  }, []);

  const pick = (id: string, index: number) =>
    setItems((list) => list!.map((item) => (item.id === id && !item.shown ? { ...item, picked: index } : item)));

  const show = (id: string) => {
    const item = items!.find((i) => i.id === id)!;
    if (item.shown) return;
    const updated = schedule(loadProgress(storage()), id, item.picked === item.check.answer);
    saveProgress(storage(), updated);
    setNext(nextReturn(updated, `${region}/`));
    setItems((list) => list!.map((i) => (i.id === id ? { ...i, shown: true } : i)));
  };

  const when = (date: Date) =>
    new Intl.DateTimeFormat(localeCode, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

  if (failed) return <p>The questions could not be loaded. Check your connection and open this page again.</p>;
  if (items === null) return <p class="muted">Looking at what is ready on this device.</p>;

  if (items.length === 0) {
    return (
      <div>
        <p class="lede">Nothing to review right now.</p>
        <p>
          {next
            ? `Your next questions come back from ${when(next)}. Nothing to do until then.`
            : 'Finish the quick check at the end of any lesson and its questions will come back here, a day later at first and then at longer gaps.'}
        </p>
        <p><a class="btn btn-secondary" href={`${base}/${region}/learn`}>Go to the lessons</a></p>
      </div>
    );
  }

  const done = items.every((item) => item.shown);
  const right = items.filter((item) => item.shown && item.picked === item.check.answer).length;

  return (
    <div>
      {items.map((item, n) => (
        <div class="poll" key={item.id}>
          <fieldset>
            <legend>{item.check.q}</legend>
            <p class="review-from">
              Question {n + 1} of {items.length}, from <a href={`${base}/${item.check.lessonPath}`}>{item.check.lesson}</a>
            </p>
            {item.check.context && <p class="review-context">{item.check.context}</p>}
            <div class="opts">
              {item.check.options.map((option, index) => (
                <label class="opt">
                  <input
                    type="radio"
                    name={item.id}
                    checked={item.picked === index}
                    disabled={item.shown}
                    onChange={() => pick(item.id, index)}
                  />
                  <span class="numbers">{option.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {!item.shown && (
            <p class="review-action">
              <button type="button" class="btn btn-secondary" onClick={() => show(item.id)}>Show the answer</button>
            </p>
          )}
          {item.shown && (
            <div class="reveal-body" role="status">
              {/* Words carry the result; the colour only repeats it, as in a lesson (lesson.css). */}
              <p class="poll-status" data-result={item.picked === null ? 'none' : item.picked === item.check.answer ? 'right' : 'wrong'}>
                {item.picked === null ? 'No pick this time.' : item.picked === item.check.answer ? 'Correct.' : 'Not quite.'}
              </p>
              <p class="answer">
                <strong class="numbers">{item.check.options[item.check.answer].text}</strong>{' '}
                {item.check.options[item.check.answer].why}
              </p>
              {item.picked !== null && item.picked !== item.check.answer && (
                <p>
                  <span class="muted">Your pick:</span> “{item.check.options[item.picked].text}” {item.check.options[item.picked].why}
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      {done && (
        <p class="return-line" role="status">
          {right} of {items.length}. {next ? `The next ones come back from ${when(next)}.` : ''} Nothing to do until then.
        </p>
      )}
    </div>
  );
}
