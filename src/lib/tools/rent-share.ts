/** Rent and bills as a share of net pay: each edition's opening values, with the sources behind them, and the pure maths. Owned by the rent-share builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/rent-share.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and RentShareConfig are imported by the page and must stay. */
import type { EditionConfigs, ToolConfig } from './types';

export interface RentShareConfig extends ToolConfig {}

export const CONFIG: EditionConfigs<RentShareConfig> = {
  eu: { scenario: 'A €520 room in a shared flat with about €80 of bills, on €1,125 net pay.' },
};
