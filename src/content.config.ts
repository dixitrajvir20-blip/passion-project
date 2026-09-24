import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { drillBankSchema, glossarySchema, lessonSchema } from './content/schema';

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

// One JSON file per edition and drill tool (src/content/drills/<edition>/<tool>.json), owned by
// that drill's builder. Entry ids are '<edition>/<tool>', e.g. 'in/spot-the-fake'.
const drills = defineCollection({
  loader: glob({ pattern: '*/*.json', base: './src/content/drills' }),
  schema: drillBankSchema,
});

export const collections = { lessons, glossary, drills };
