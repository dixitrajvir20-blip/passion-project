/** Card balance at the minimum payment: each edition's opening values, with the sources behind them, and the pure maths. Owned by the card-minimum builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/card-minimum.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and CardMinimumConfig are imported by the page and must stay. */
import type { EditionConfigs, ToolConfig } from './types';

export interface CardMinimumConfig extends ToolConfig {}

export const CONFIG: EditionConfigs<CardMinimumConfig> = {
  in: { scenario: 'The card statement from the India lesson, with ₹20,000 owed, a 5% minimum due and interest at 3.5% a month.' },
  us: { scenario: 'The first card statement from the US lesson, with $400 owed, a $25 minimum and an example 27.5% APR.' },
};
