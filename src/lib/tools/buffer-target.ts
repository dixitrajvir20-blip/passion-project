/** Buffer target and the payday it is reached: each edition's opening values, with the sources behind them, and the pure maths. Owned by the buffer-target builder. Tool maths and pins from the revised spec go here and in tests/unit/tools/buffer-target.test.ts, never in finance.ts; defaults and rules go in CONFIG, never in regions.ts. The names CONFIG and BufferTargetConfig are imported by the page and must stay. */
import type { EditionConfigs, ToolConfig } from './types';

export interface BufferTargetConfig extends ToolConfig {}

export const CONFIG: EditionConfigs<BufferTargetConfig> = {
  in: { scenario: 'Five costs from a month of part-time pay, ₹5,500, with ₹2,000 moved aside each payday.' },
  eu: { scenario: 'Four essentials, €730 a month, held for three months, with €185 moved aside each payday.' },
  us: { scenario: 'Four must-pay costs, $1,055 a month, with $50 moved aside from each paycheck, paid every two weeks.' },
};
