/**
 * Rule freshness, run by `npm run rules` (part of ship-check), never by the unit run: a test that
 * fails on a calendar date would break unrelated work on the day a figure turns twelve months old.
 *
 * Every Rule a tool prints carries asOf, the day its source was last opened. At eleven months, or
 * once its reviewBy date has come, this prints a warning; at twelve months it fails the release
 * gate until someone re-opens the source and updates asOf.
 */
import { describe, it, expect } from 'vitest';
import { CONFIGS } from '../../src/lib/tools/configs';
import type { Rule } from '../../src/lib/tools/types';

const DAY = 86_400_000;
const WARN_DAYS = 334;
const FAIL_DAYS = 365;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const now = new Date();
const today = now.toISOString().slice(0, 10);
const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

const parse = (iso: string): number => (ISO_DATE.test(iso) ? Date.parse(`${iso}T00:00:00Z`) : Number.NaN);

interface Checked {
  where: string;
  rule: Rule;
}

const rules: Checked[] = Object.entries(CONFIGS).flatMap(([slug, editions]) =>
  Object.entries(editions).flatMap(([edition, config]) =>
    (config?.rules ?? []).map((rule) => ({ where: `${slug} ${edition} ${rule.key}`, rule })),
  ),
);

describe('the rules every tool prints are fresh', () => {
  it('every asOf and reviewBy is a real date, and none is in the future', () => {
    const bad = rules.flatMap(({ where, rule }) => {
      const problems: string[] = [];
      const asOf = parse(rule.asOf);
      if (Number.isNaN(asOf)) problems.push(`${where}: asOf "${rule.asOf}" is not a YYYY-MM-DD date`);
      else if (asOf > todayUtc) problems.push(`${where}: asOf ${rule.asOf} is after today (${today})`);
      if (rule.reviewBy !== undefined && Number.isNaN(parse(rule.reviewBy))) {
        problems.push(`${where}: reviewBy "${rule.reviewBy}" is not a YYYY-MM-DD date`);
      }
      return problems;
    });
    expect(bad).toEqual([]);
  });

  it('no rule was checked more than 12 months ago (warns at 11 months or a passed reviewBy)', () => {
    const failures: string[] = [];
    for (const { where, rule } of rules) {
      const asOf = parse(rule.asOf);
      if (Number.isNaN(asOf)) continue; // reported by the test above
      const age = Math.floor((todayUtc - asOf) / DAY);
      const message = `${where}: checked ${rule.asOf}, more than 12 months ago; re-open the source and update asOf`;
      if (age >= FAIL_DAYS) {
        failures.push(message);
      } else if (age >= WARN_DAYS) {
        console.warn(`${where}: checked ${rule.asOf}, more than 11 months ago; re-open the source and update asOf`);
      } else if (rule.reviewBy !== undefined && rule.reviewBy <= today) {
        console.warn(`${where}: checked ${rule.asOf}, review was due ${rule.reviewBy}; re-open the source and update asOf`);
      }
    }
    expect(failures).toEqual([]);
  });

  it(`found ${rules.length} rule${rules.length === 1 ? '' : 's'} across ${Object.keys(CONFIGS).length} tools`, () => {
    expect(Object.keys(CONFIGS).length).toBeGreaterThan(0);
  });
});
