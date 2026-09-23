/** Tax on side income and fees: each edition's opening values, with the sources behind them, and the pure maths. Owned by the side-income-tax builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/side-income-tax.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and SideIncomeTaxConfig are imported by the page and must stay. */
import type { EditionConfigs, ToolConfig } from './types';

export interface SideIncomeTaxConfig extends ToolConfig {}

export const CONFIG: EditionConfigs<SideIncomeTaxConfig> = {
  in: { scenario: 'The lesson’s internship: ₹1,50,000 invoiced, ₹1,35,000 arrived.' },
  us: { scenario: 'The lesson’s year of tutoring and reselling: $6,000 in, $1,000 of costs.' },
};
