/** A loan's cost as a yearly rate: each edition's opening values, with the sources behind them, and the pure maths. Owned by the yearly-rate builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/yearly-rate.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and YearlyRateConfig are imported by the page and must stay. */
import type { EditionConfigs, ToolConfig } from './types';

export interface YearlyRateConfig extends ToolConfig {}

export const CONFIG: EditionConfigs<YearlyRateConfig> = {
  in: { scenario: 'A ₹5,000 app loan from the lesson, with ₹5,500 due back seven days later.' },
};
