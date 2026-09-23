import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../../src/lib/tools/yearly-rate';

describe('yearly-rate', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['in']));
  it.todo('every pin in the revised spec');
});
