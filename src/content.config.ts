import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { glossarySchema, lessonSchema } from './content/schema';

const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: lessonSchema,
});

// One JSON file per term (src/content/glossary/<id>.json), so terms can be added in parallel
// without everyone editing the same file. The file name is the id a lesson's <Term id> uses.
const glossary = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/glossary' }),
  schema: glossarySchema,
});

export const collections = { lessons, glossary };
