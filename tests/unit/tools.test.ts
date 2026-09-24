/**
 * The contract between the foundation and each tool's builder: the registry (src/lib/tools.ts)
 * and every per-tool config (src/lib/tools/<slug>.ts). A builder's CONFIG is checked here without
 * anyone editing a shared test. Rule freshness (age against today) is `npm run rules`, not this.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  EXPLORER_TOOL,
  GROUPS,
  TOOLS,
  groupsFor,
  lessonToolLinks,
  registeredFor,
  titleFor,
  toolBySlug,
  toolMetaLine,
  toolsFor,
} from '../../src/lib/tools';
import { CONFIGS, LEGACY_CALCULATORS, configFor } from '../../src/lib/tools/configs';
import { EDITIONS, formatCheckedDate, latestAsOf, type Rule } from '../../src/lib/tools/types';

const GLOSSARY_DIR = join(__dirname, '../../src/content/glossary');
const editionsOf = (slug: string) => {
  const tool = toolBySlug(slug)!;
  return (tool.regions ?? [...EDITIONS]).slice().sort();
};
const isRealDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
};
const today = new Date().toISOString().slice(0, 10);

describe('the tool registry', () => {
  it('lists the fourteen tools in page order', () => {
    expect(TOOLS.map((t) => t.slug)).toEqual([
      'take-home-pay',
      'budget',
      'buffer-target',
      'savings',
      'loan',
      'yearly-rate',
      'card-minimum',
      'pay-later-payday',
      'rent-share',
      'side-hustle',
      'break-even',
      'side-income-tax',
      'spot-the-fake',
      'job-offer-check',
    ]);
  });

  it('gives every tool a unique kebab-case slug, a format, a group and a time', () => {
    const slugs = TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const groups = new Set(GROUPS.map((g) => g.id));
    for (const tool of TOOLS) {
      expect(tool.slug, tool.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(['calculator', 'drill'], tool.slug).toContain(tool.format);
      expect(groups.has(tool.group), `${tool.slug}: group ${tool.group}`).toBe(true);
      expect(Number.isInteger(tool.minutes) && tool.minutes >= 1 && tool.minutes <= 10, `${tool.slug}: minutes`).toBe(true);
    }
  });

  it('asks each question in the reader’s words, ending with a question mark', () => {
    for (const tool of TOOLS) {
      expect(tool.answers.endsWith('?'), `${tool.slug}: answers`).toBe(true);
      expect(tool.short.endsWith('?'), `${tool.slug}: short`).toBe(true);
    }
  });

  it('gives an edition title only to an edition the tool is in', () => {
    for (const tool of TOOLS) {
      for (const edition of Object.keys(tool.titles ?? {})) {
        expect(tool.regions ?? EDITIONS, `${tool.slug}: titles.${edition}`).toContain(edition);
      }
    }
  });

  it('has twelve tools in India and eleven in Europe and the United States', () => {
    expect(registeredFor('in')).toHaveLength(12);
    expect(registeredFor('eu')).toHaveLength(11);
    expect(registeredFor('us')).toHaveLength(11);
  });

  it('groups each edition’s tools by moment, in page order, with no empty group', () => {
    const all = (edition: string) => groupsFor(edition, registeredFor(edition));
    expect(all('eu').map((g) => g.group.id)).toEqual(['first-pay', 'buffer', 'borrowing', 'moving-out', 'own-work', 'scams']);
    expect(all('in').map((g) => g.group.id)).toEqual(['first-pay', 'buffer', 'borrowing', 'own-work', 'scams']);
    expect(all('us').map((g) => g.group.id)).toEqual(['first-pay', 'buffer', 'borrowing', 'own-work', 'scams']);
    for (const edition of EDITIONS) {
      for (const groups of [all(edition), groupsFor(edition)]) {
        for (const { tools } of groups) expect(tools.length).toBeGreaterThan(0);
        const order = groups.flatMap((g) => g.tools).map((t) => TOOLS.indexOf(t));
        expect(order).toEqual(order.slice().sort((a, b) => a - b));
      }
      expect(all(edition).flatMap((g) => g.tools)).toHaveLength(registeredFor(edition).length);
      // By default only the tools that are ready to show.
      expect(groupsFor(edition).flatMap((g) => g.tools)).toEqual(toolsFor(edition));
    }
    expect(all('in').find((g) => g.group.id === 'borrowing')!.tools.map((t) => t.slug)).toEqual(['loan', 'yearly-rate', 'card-minimum']);
    expect(groupsFor('us', toolsFor('us').filter((t) => t.slug !== 'job-offer-check')).map((g) => g.group.id)).not.toContain('scams');
  });

  it('shows a tool only once it is ready: a stub calculator has no page, row, panel line or hand-off', () => {
    for (const edition of EDITIONS) {
      const shown = toolsFor(edition);
      for (const tool of registeredFor(edition)) {
        expect(shown.includes(tool), `${edition}/${tool.slug}`).toBe(tool.ready !== false);
      }
    }
    // A drill's readiness is its bank file (drills.test.ts), never this flag.
    for (const tool of TOOLS.filter((t) => t.ready === false)) expect(tool.format, tool.slug).toBe('calculator');
  });

  // Visible until each builder deletes its tool's `ready: false`; the release check allows none.
  for (const tool of TOOLS.filter((t) => t.ready === false)) {
    it.todo(`${tool.slug} is still a stub: its builder deletes ready: false in src/lib/tools.ts`);
  }

  it('titles a tool for its edition', () => {
    const fake = toolBySlug('spot-the-fake')!;
    expect(titleFor(fake, 'in')).toBe('UPI: spot the fake');
    expect(titleFor(fake, 'eu')).toBe('Payments: spot the fake');
    expect(toolBySlug('nope')).toBeUndefined();
  });

  it('links a lesson to its tools, without the one its explorer opens', () => {
    const borrowing = lessonToolLinks('in', 'loan', ['yearly-rate', 'card-minimum'], 'loan', registeredFor('in'));
    expect(borrowing.map((l) => l.tool.slug)).toEqual(['yearly-rate', 'card-minimum']);
    expect(borrowing[0].text).toBe('Try your own numbers: what is this loan as a yearly rate?');
    expect(lessonToolLinks('in', 'take-home-pay', undefined, 'deduction', registeredFor('in'))[0].text).toBe(
      'Try your own numbers: what reaches my account?',
    );

    expect(lessonToolLinks('us', 'side-income-tax', ['budget'], 'split', registeredFor('us')).map((l) => l.tool.slug)).toEqual(['side-income-tax']);
    expect(lessonToolLinks('in', 'job-offer-check', undefined, 'drill').map((l) => l.text)).toEqual([
      'Practise on more situations in “Job offers: spot the fake”',
    ]);
    expect(lessonToolLinks('in', 'spot-the-fake', undefined, 'drill').map((l) => l.text)).toEqual([
      'Practise on more situations in “UPI: spot the fake”',
    ]);
    expect(lessonToolLinks('in', 'budget', ['budget'], 'deduction')).toHaveLength(1);
    expect(lessonToolLinks('eu', 'yearly-rate', undefined, 'deduction', registeredFor('eu'))).toEqual([]);
    expect(EXPLORER_TOOL).toEqual({ margin: 'break-even', split: 'budget', loan: 'loan', growth: 'savings' });
  });

  it('hands off only to tools that are ready, by default', () => {
    const ready = (slug: string) => toolBySlug(slug)!.ready !== false;
    expect(lessonToolLinks('in', 'loan', ['yearly-rate', 'card-minimum'], 'loan').map((l) => l.tool.slug)).toEqual(
      ['yearly-rate', 'card-minimum'].filter(ready),
    );
    expect(lessonToolLinks('in', 'take-home-pay', ['budget'], 'deduction').map((l) => l.tool.slug)).toEqual(
      ['take-home-pay', 'budget'].filter(ready),
    );
  });

  it('describes each tool in one quiet meta line', () => {
    expect(toolMetaLine(toolBySlug('loan')!)).toBe('Calculator, about 2 minutes');
    expect(toolMetaLine(toolBySlug('job-offer-check')!, 6)).toBe('Drill, 6 situations, about 5 minutes');
    expect(toolMetaLine(toolBySlug('job-offer-check')!)).toBe('Drill, about 5 minutes');
    expect(toolMetaLine({ ...toolBySlug('loan')!, minutes: 1 })).toBe('Calculator, about 1 minute');
  });
});

describe('the per-tool configs', () => {
  const slugs = Object.keys(CONFIGS);

  it('has a module for each of the seven new calculators and none for a drill', () => {
    expect(slugs.sort()).toEqual(
      ['buffer-target', 'card-minimum', 'pay-later-payday', 'rent-share', 'side-income-tax', 'take-home-pay', 'yearly-rate'].sort(),
    );
    for (const slug of slugs) expect(toolBySlug(slug)?.format, slug).toBe('calculator');
  });

  it('covers every calculator, with the five older ones in regions.ts', () => {
    const calculators = TOOLS.filter((t) => t.format === 'calculator').map((t) => t.slug).sort();
    expect([...LEGACY_CALCULATORS, ...slugs].sort()).toEqual(calculators);
    for (const slug of LEGACY_CALCULATORS) expect(slugs).not.toContain(slug);
  });

  it('finds one edition’s config, and nothing for an edition the tool lacks', () => {
    expect(configFor('rent-share', 'in')).toBeUndefined();
    expect(configFor('rent-share', 'eu')?.scenario).toBeTruthy();
    expect(configFor('break-even', 'in')).toBeUndefined();
    expect(configFor('__proto__', 'in')).toBeUndefined();
  });

  for (const slug of Object.keys(CONFIGS)) {
    describe(slug, () => {
      const configs = CONFIGS[slug];

      it('has a config for exactly the editions the registry lists (the page fails the build otherwise)', () => {
        expect(Object.keys(configs).sort()).toEqual(editionsOf(slug));
      });

      it('is plain JSON data, because Astro serialises it into the page', () => {
        expect(JSON.parse(JSON.stringify(configs))).toEqual(configs);
      });

      for (const [edition, config] of Object.entries(configs)) {
        it(`${edition}: opens on one example sentence`, () => {
          expect(typeof config!.scenario).toBe('string');
          expect(config!.scenario.endsWith('.'), config!.scenario).toBe(true);
          expect(config!.scenario.length).toBeLessThanOrEqual(160);
          expect(config!.scenario.charAt(0)).toBe(config!.scenario.charAt(0).toUpperCase());
        });

        it(`${edition}: every rule has a key, a value, a label, an https source and a checked date`, () => {
          const rules: Rule[] = config!.rules ?? [];
          const keys = rules.map((r) => r.key);
          expect(new Set(keys).size, 'rule keys repeat').toBe(keys.length);
          for (const rule of rules) {
            expect(rule.key, 'key').toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
            expect(Number.isFinite(rule.value), `${rule.key}: value`).toBe(true);
            expect(rule.label.trim().length, `${rule.key}: label`).toBeGreaterThan(0);
            expect(rule.source.title.trim().length, `${rule.key}: source title`).toBeGreaterThan(0);
            expect(rule.source.url, `${rule.key}: source url`).toMatch(/^https:\/\//);
            expect(rule.asOf, `${rule.key}: asOf`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(isRealDate(rule.asOf), `${rule.key}: asOf is a real date`).toBe(true);
            expect(rule.asOf <= today, `${rule.key}: asOf ${rule.asOf} is in the future`).toBe(true);
            if (rule.reviewBy !== undefined) {
              expect(isRealDate(rule.reviewBy), `${rule.key}: reviewBy`).toBe(true);
              expect(rule.reviewBy > rule.asOf, `${rule.key}: reviewBy after asOf`).toBe(true);
            }
          }
        });

        it(`${edition}: every term it lists is in the glossary`, () => {
          for (const id of config!.glossary ?? []) {
            expect(existsSync(join(GLOSSARY_DIR, `${id}.json`)), `glossary id "${id}"`).toBe(true);
          }
        });
      }
    });
  }
});

describe('rule dates', () => {
  const rule = (asOf: string): Rule => ({ key: 'k', value: 1, label: 'l', source: { title: 't', url: 'https://x.example' }, asOf });

  it('finds the most recent check', () => {
    expect(latestAsOf([rule('2026-07-02'), rule('2026-09-22')])).toBe('2026-09-22');
    expect(latestAsOf([rule('2026-09-22'), rule('2026-07-02')])).toBe('2026-09-22');
    expect(latestAsOf([])).toBeNull();
  });

  it('writes a checked date the same way whatever the time zone', () => {
    expect(formatCheckedDate('2026-09-22')).toBe('22 September 2026');
  });
});
