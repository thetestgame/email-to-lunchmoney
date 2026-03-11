import {env} from 'cloudflare:test';
import PostalMime from 'postal-mime';
import {expect, test} from 'vitest';

import {twitchProcessor} from '.';

test('can process invoice receipt', async () => {
  const emailFile = await import('./fixtures/bits.eml?raw');
  const email = await PostalMime.parse(emailFile.default);

  const result = await twitchProcessor.process(email, env);

  expect(result).toEqual({
    type: 'update',
    match: {expectedPayee: 'Twitch', expectedTotal: 739},
    note: '500 Bits (696026438)',
  });
});

test('can process subscription receipt with channel name', async () => {
  const emailFile = await import('./fixtures/subscription.eml?raw');
  const email = await PostalMime.parse(emailFile.default);

  const result = await twitchProcessor.process(email, env);

  expect(result).toEqual({
    type: 'update',
    match: {expectedPayee: 'Twitch', expectedTotal: 632},
    note: 'Tier 1 - 1 Month Subscription - US, Ray (699104883)',
  });
});

test('does match invoice receipt', async () => {
  const emailFile = await import('./fixtures/bits.eml?raw');
  const email = await PostalMime.parse(emailFile.default);

  expect(twitchProcessor.matchEmail(email)).toBe(true);
});

test('does match thanks for subscribing subject prefix', () => {
  const email = {
    from: {address: 'purchase-noreply@twitch.tv'},
    subject: 'Thanks for Subscribing to ExampleChannel!',
  } as const;

  expect(twitchProcessor.matchEmail(email as any)).toBe(true);
});
