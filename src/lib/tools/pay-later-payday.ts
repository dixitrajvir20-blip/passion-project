/** Pay-later plans against one payday: each edition's opening values, with the sources behind them, and the pure maths. Owned by the pay-later-payday builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/pay-later-payday.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and PayLaterPaydayConfig are imported by the page and must stay. */
import type { EditionConfigs, ToolConfig } from './types';

export interface PayLaterPaydayConfig extends ToolConfig {}

export const CONFIG: EditionConfigs<PayLaterPaydayConfig> = {
  eu: { scenario: 'Three pay-later plans, each on payment 2 of 4, due before a €1,200 payday.' },
  us: { scenario: 'Three pay-in-four plans of $15, each on payment 2 of 4, due before a $1,317 payday.' },
};
