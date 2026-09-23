import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../../src/lib/tools/rent-share';

describe('rent-share', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['eu']));
  it.todo('every pin in the revised spec');
});
