import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../../src/lib/tools/pay-later-payday';

describe('pay-later-payday', () => {
  it('has a config for each edition it is listed in', () => expect(Object.keys(CONFIG).sort()).toEqual(['eu', 'us']));
  it.todo('every pin in the revised spec');
});
