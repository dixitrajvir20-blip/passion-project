/**
 * One drill tool's situations for one edition: the lesson's own screens first, then the bank's.
 * Pure, so the page, checks.json and the unit tests share it.
 *
 * Review ids: a lesson's screen keeps the id it has in the lesson ('<edition>/<track>/<slug>#d1'),
 * so practising it on the tool page schedules the same item; a bank's screen gets
 * '<edition>/tools/<tool>#<id>'. 'tools' is not a track, so the two can never collide.
 */
import type { DrillCheck, DrillScreen } from '../content/schema';

export const lessonCheckId = (lessonId: string, index: number): string => `${lessonId}#d${index + 1}`;
export const bankCheckId = (region: string, tool: string, id: string): string => `${region}/tools/${tool}#${id}`;

export interface DrillSituation {
  checkId: string;
  origin: 'lesson' | 'bank';
  ordinary: boolean;
  screen: DrillScreen;
  check: DrillCheck;
}

export function mergeDrill(
  region: string,
  tool: string,
  lessonId: string,
  lessonScenarios: readonly { screen: DrillScreen; check: DrillCheck; ordinary?: boolean }[],
  bankScenarios: readonly { id: string; screen: DrillScreen; check: DrillCheck; ordinary: boolean }[],
): DrillSituation[] {
  return [
    ...lessonScenarios.map((s, index) => ({
      checkId: lessonCheckId(lessonId, index),
      origin: 'lesson' as const,
      ordinary: s.ordinary ?? false,
      screen: s.screen,
      check: s.check,
    })),
    ...bankScenarios.map((s) => ({
      checkId: bankCheckId(region, tool, s.id),
      origin: 'bank' as const,
      ordinary: s.ordinary,
      screen: s.screen,
      check: s.check,
    })),
  ];
}
