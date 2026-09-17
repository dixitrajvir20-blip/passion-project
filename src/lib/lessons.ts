import { getCollection, type CollectionEntry } from 'astro:content';
import type { TrackSlug } from './regions';

export type Lesson = CollectionEntry<'lessons'>;

export const slugOf = (lesson: Lesson): string => lesson.id.split('/').pop()!;

/** Path under the site base, no leading or trailing slash: "in/learn/money-basics/upi-scam". */
export const lessonPath = (lesson: Lesson): string =>
  `${lesson.data.region}/learn/${lesson.data.track}/${slugOf(lesson)}`;

/** Published lessons for one edition, in track order. */
export async function lessonsFor(region: string): Promise<Lesson[]> {
  const all = await getCollection('lessons', (entry) => entry.data.region === region);
  for (const lesson of all) {
    // The folder is the address; frontmatter that disagrees with it would publish a lesson
    // under one edition's URL with another edition's examples.
    const expected = `${lesson.data.region}/${lesson.data.track}/${slugOf(lesson)}`;
    if (lesson.id !== expected) {
      throw new Error(`Lesson "${lesson.id}" says it belongs at "${expected}". Move the file or fix its frontmatter.`);
    }
  }
  return all.sort((a, b) => a.data.order - b.data.order);
}

export function inTrack(lessons: Lesson[], track: TrackSlug): Lesson[] {
  return lessons.filter((lesson) => lesson.data.track === track);
}
