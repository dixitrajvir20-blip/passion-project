/**
 * Every per-tool config, reached through one import map written once by the foundation. The page
 * passes one edition's config to the island as a prop; islands import only maths and types from
 * their module, so these literals never reach the island's JavaScript.
 */
import type { EditionConfigs, ToolConfig } from './types';
import { CONFIG as takeHomePay } from './take-home-pay';
import { CONFIG as yearlyRate } from './yearly-rate';
import { CONFIG as cardMinimum } from './card-minimum';
import { CONFIG as bufferTarget } from './buffer-target';
import { CONFIG as payLaterPayday } from './pay-later-payday';
import { CONFIG as rentShare } from './rent-share';
import { CONFIG as sideIncomeTax } from './side-income-tax';

export const CONFIGS: Record<string, EditionConfigs> = {
  'take-home-pay': takeHomePay,
  'yearly-rate': yearlyRate,
  'card-minimum': cardMinimum,
  'buffer-target': bufferTarget,
  'pay-later-payday': payLaterPayday,
  'rent-share': rentShare,
  'side-income-tax': sideIncomeTax,
};

/** The five calculators built before per-tool modules: their numbers are in regions.ts. */
export const LEGACY_CALCULATORS = ['break-even', 'budget', 'savings', 'side-hustle', 'loan'] as const;

export function configFor(slug: string, edition: string): ToolConfig | undefined {
  const configs = Object.hasOwn(CONFIGS, slug) ? CONFIGS[slug] : undefined;
  return configs && Object.hasOwn(configs, edition) ? configs[edition as keyof EditionConfigs] : undefined;
}
