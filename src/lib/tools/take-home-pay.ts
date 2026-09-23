/** Take-home pay, line by line: each edition's opening values, with the sources behind them, and the pure maths. Owned by the take-home-pay builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/take-home-pay.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and TakeHomePayConfig are imported by the page and must stay. */
import type { EditionConfigs, ToolConfig } from './types';

export interface TakeHomePayConfig extends ToolConfig {}

export const CONFIG: EditionConfigs<TakeHomePayConfig> = {
  in: { scenario: 'The first payslip from the India lesson: a ₹4,20,000 CTC, ₹35,000 a month.' },
  eu: { scenario: 'The Europe lesson’s first apprentice payslip: €1,500 gross a month.' },
  us: { scenario: 'The US lesson’s first pay stub: 80 hours at $20.' },
};
