/**
 * Every reviewable check for one edition, written at build time. The review page fetches this
 * (same origin, so the CSP allows it) and asks only the ones this device's schedule says are ready.
 * Questions, options and explanations only: nothing here is about a reader.
 *
 * Lesson checks are keyed by lesson ('in/protect-your-money/upi-fraud-and-the-clock#d2'); a drill
 * tool's own situations by tool ('in/tools/spot-the-fake#kyc-link'). A lesson's screens shown on
 * a tool page are the lesson's checks, so they are never written twice.
 */
import type { APIRoute } from 'astro';
import { REGIONS } from '../../lib/regions';
import { lessonPath, lessonsFor } from '../../lib/lessons';
import { localeByCode, money } from '../../lib/format';
import { titleFor } from '../../lib/tools';
import { availableTools, drillFor } from '../../lib/drills';
import type { DrillScreen } from '../../content/schema';

export interface ReviewCheck {
  lesson: string;
  lessonPath: string;
  /** For drill situations: the made-up message the question is about. */
  context?: string;
  q: string;
  options: { text: string; why: string }[];
  answer: number;
}

export function getStaticPaths() {
  return REGIONS.map((r) => ({ params: { region: r.code } }));
}

export const GET: APIRoute = async ({ params }) => {
  const region = REGIONS.find((r) => r.code === params.region)!;
  const locale = localeByCode(region.locale);
  // The sender, the amount as the screen prints it, the lines, and the button it wants pressed.
  const contextOf = (screen: DrillScreen) =>
    [
      `${screen.from}:`,
      screen.amount !== undefined ? money(screen.amount, locale, Number.isInteger(screen.amount) ? 0 : 2) : '',
      ...screen.lines,
      screen.action ? `[${screen.action}]` : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  const checks: Record<string, ReviewCheck> = {};
  for (const lesson of await lessonsFor(region.code)) {
    const shared = { lesson: lesson.data.title, lessonPath: lessonPath(lesson) };
    lesson.data.quiz.forEach((check, i) => {
      checks[`${lesson.id}#q${i + 1}`] = { ...shared, ...check };
    });
    if (lesson.data.explorable?.kind === 'drill') {
      lesson.data.explorable.scenarios.forEach(({ screen, check }, i) => {
        checks[`${lesson.id}#d${i + 1}`] = { ...shared, context: contextOf(screen), ...check };
      });
    }
  }
  for (const tool of await availableTools(region.code)) {
    if (tool.format !== 'drill') continue;
    const drill = await drillFor(region.code, tool.slug);
    if (!drill) continue;
    const shared = { lesson: titleFor(tool, region.code), lessonPath: `${region.code}/tools/${tool.slug}` };
    for (const situation of drill.situations) {
      if (situation.origin !== 'bank') continue;
      checks[situation.checkId] = { ...shared, context: contextOf(situation.screen), ...situation.check };
    }
  }
  return new Response(JSON.stringify(checks), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
