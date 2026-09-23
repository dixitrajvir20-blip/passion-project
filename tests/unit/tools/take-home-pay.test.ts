import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../../src/lib/tools/take-home-pay';

describe('take-home-pay', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['eu', 'in', 'us']));
  it.todo('every pin in the revised spec');
});
