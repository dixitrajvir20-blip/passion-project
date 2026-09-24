/**
 * What every per-tool module (src/lib/tools/<slug>.ts) shares: the edition keys, the Rule a
 * calculator prints with its source and date, and the config shape the page passes to an island.
 * Rule lives here, not in regions.ts, because each tool's edition data lives in its own module.
 */
import type { Source } from '../regions';

export type Edition = 'in' | 'eu' | 'us';
export const EDITIONS: readonly Edition[] = ['in', 'eu', 'us'];

/** An edition-bound figure a calculator uses, with where it comes from and when it was checked. */
export interface Rule {
  /** Unique within the tool, e.g. 'epfRate'. */
  key: string;
  value: number;
  /** Reader-facing, printed in the RulesLine. */
  label: string;
  /** https only. */
  source: Source;
  /** YYYY-MM-DD: the day the source was last opened. */
  asOf: string;
  /** YYYY-MM-DD: when the figure is known to change. */
  reviewBy?: string;
  /** false keeps a rule out of the RulesLine, e.g. a test-only pin. */
  inLine?: boolean;
}

export interface ToolConfig {
  /** The "It opens on an example" sentence: capitalised, ending in a full stop. */
  scenario: string;
  rules?: Rule[];
  /** Default 'Rules as of'. */
  rulesLead?: string;
  /** Ids in src/content/glossary, shown as "Terms on this page". */
  glossary?: string[];
}

/**
 * One config per edition the tool appears in. Plain JSON data only (strings, numbers, booleans,
 * arrays, objects): Astro serialises it into the page as the island's prop.
 */
export type EditionConfigs<C extends ToolConfig = ToolConfig> = Partial<Record<Edition, C>>;

/** The most recent asOf among the rules (dates compare as text), or null for none. */
export function latestAsOf(rules: readonly Rule[]): string | null {
  return rules.reduce<string | null>((latest, rule) => (latest === null || rule.asOf > latest ? rule.asOf : latest), null);
}

/** '2026-09-22' as '22 September 2026', the same whatever the build machine's time zone. */
export function formatCheckedDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}
