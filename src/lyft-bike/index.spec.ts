import {env} from 'cloudflare:test';
import PostalMime from 'postal-mime';
import {describe, expect, it} from 'vitest';

import fixtureEmail from './fixtures/example.eml?raw';
import {lyftBikeProcessor} from '.';

describe('Lyft Bike EmailProcessor', () => {
  it('Processes and creates a LunchMoneyAction for a lyft bike receipt', async () => {
    const email = await PostalMime.parse(fixtureEmail);

    const result = await lyftBikeProcessor.process(email, env);

    expect(result).toEqual({
      type: 'update',
      match: {expectedPayee: 'Lyft Bike', expectedTotal: 245},
      note: 'E 2 St & Ave C → E 5 St & Ave C [12:37, 9m]',
    });
  });
});
