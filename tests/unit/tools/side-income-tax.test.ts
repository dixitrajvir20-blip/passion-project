import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../../src/lib/tools/side-income-tax';

describe('side-income-tax', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['in', 'us']));
  it.todo('every pin in the revised spec');
});
