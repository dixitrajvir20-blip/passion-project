/**
 * Drill tools, from their banks (src/content/drills/<edition>/<tool>.json) and the lesson each
 * bank names. The tool pages, the tools index, the edition fronts and checks.json all ask here,
 * so "does this edition have this drill?" has one answer: its bank file exists.
 *
 * Throws, failing the build, when a bank and the registry or its lesson disagree.
 */
import { getEntry, type CollectionEntry } from 'astro:content';
import { mergeDrill, type DrillSituation } from './drill-merge';
import { toolBySlug, toolsFor, type ToolMeta } from './tools';
import type { Lesson } from './lessons';

export type DrillBank = CollectionEntry<'drills'>;

export interface ToolDrill {
  bank: DrillBank;
  lesson: Lesson;
  situations: DrillSituation[];
  reportTo?: { phone?: string; url: string; label: string };
}

export async function drillFor(region: string, slug: string): Promise<ToolDrill | null> {
  const bank = await getEntry('drills', `${region}/${slug}`);
  if (!bank) return null;
  const where = `src/content/drills/${region}/${slug}.json`;
  if (bank.data.region !== region || bank.data.tool !== slug) {
    throw new Error(`${where} says it is ${bank.data.region}/${bank.data.tool}. The folder is the edition and the file name is the tool.`);
  }
  if (toolBySlug(slug)?.format !== 'drill') {
    throw new Error(`${where}: "${slug}" is not a drill in src/lib/tools.ts.`);
  }
  const lesson = await getEntry('lessons', bank.data.fromLesson);
  if (!lesson) throw new Error(`${where}: fromLesson "${bank.data.fromLesson}" is not a lesson.`);
  if (lesson.data.region !== region) {
    throw new Error(`${where}: fromLesson "${bank.data.fromLesson}" belongs to the ${lesson.data.region} edition.`);
  }
  const explorable = lesson.data.explorable;
  if (explorable?.kind !== 'drill') {
    throw new Error(`${where}: fromLesson "${bank.data.fromLesson}" has no drill explorable.`);
  }
  const situations = mergeDrill(region, slug, lesson.id, explorable.scenarios, bank.data.scenarios);
  return { bank, lesson, situations, reportTo: bank.data.reportTo ?? lesson.data.reportTo };
}

/** False for an unknown tool or one this edition lacks; a drill needs its bank. */
export async function toolAvailable(region: string, slug: string): Promise<boolean> {
  const tool = toolsFor(region).find((t) => t.slug === slug);
  if (!tool) return false;
  if (tool.format === 'calculator') return true;
  return (await getEntry('drills', `${region}/${slug}`)) !== undefined;
}

/** The edition's tools that have a page, in TOOLS order. */
export async function availableTools(region: string): Promise<ToolMeta[]> {
  const tools = toolsFor(region);
  const available = await Promise.all(tools.map((tool) => toolAvailable(region, tool.slug)));
  return tools.filter((_, index) => available[index]);
}
