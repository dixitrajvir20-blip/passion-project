/**
 * Every reviewable check for one edition, written at build time. The review page fetches this
 * (same origin, so the CSP allows it) and asks only the ones this device's schedule says are ready.
 * Questions, options and explanations only: nothing here is about a reader.
 */
import type { APIRoute } from 'astro';
import { REGIONS } from '../../lib/regions';
import { lessonPath, lessonsFor } from '../../lib/lessons';

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
  const checks: Record<string, ReviewCheck> = {};
  for (const lesson of await lessonsFor(params.region!)) {
    const shared = { lesson: lesson.data.title, lessonPath: lessonPath(lesson) };
    lesson.data.quiz.forEach((check, i) => {
      checks[`${lesson.id}#q${i + 1}`] = { ...shared, ...check };
    });
    if (lesson.data.explorable?.kind === 'drill') {
      lesson.data.explorable.scenarios.forEach(({ screen, check }, i) => {
        const context = [`${screen.from}:`, ...screen.lines, screen.action ? `[${screen.action}]` : ''].join(' ').trim();
        checks[`${lesson.id}#d${i + 1}`] = { ...shared, context, ...check };
      });
    }
  }
  return new Response(JSON.stringify(checks), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
