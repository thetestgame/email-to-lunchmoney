import {env} from 'cloudflare:test';
import PostalMime from 'postal-mime';
import {expect, it} from 'vitest';

import example1Fixtures from './fixtures/example-1.eml?raw';
import example2Fixtures from './fixtures/example-2.eml?raw';
import example3Fixtures from './fixtures/example-3.eml?raw';
import {appleEmailProcessor} from '.';

it('matches apple purchase emails', async () => {
  const emailOne = await PostalMime.parse(example1Fixtures);
  expect(appleEmailProcessor.matchEmail(emailOne)).toBe(true);

  const emailTwo = await PostalMime.parse(example2Fixtures);
  expect(appleEmailProcessor.matchEmail(emailTwo)).toBe(true);

  const emailThree = await PostalMime.parse(example3Fixtures);
  expect(appleEmailProcessor.matchEmail(emailThree)).toBe(true);
});

it('processes and creates a LunchMoneyAction for a example-1', async () => {
  const email = await PostalMime.parse(example1Fixtures);
  const result = await appleEmailProcessor.process(email, env);

  expect(result).toEqual({
    type: 'update',
    match: {expectedPayee: 'Apple', expectedTotal: 999},
    note: 'iCloud+ with 2 TB of Storage, Monthly',
  });
});

it('processes and creates a LunchMoneyAction for a example-2', async () => {
  const email = await PostalMime.parse(example2Fixtures);
  const result = await appleEmailProcessor.process(email, env);

  expect(result).toEqual({
    type: 'update',
    match: {expectedPayee: 'Apple', expectedTotal: 599},
    note: 'EPIK - AI Photo Editor, Yearbook Express discount',
  });
});

it('processes and creates a LunchMoneyAction for a example-3', async () => {
  const email = await PostalMime.parse(example3Fixtures);
  const result = await appleEmailProcessor.process(email, env);

  expect(result).toEqual({
    type: 'update',
    match: {expectedPayee: 'Apple', expectedTotal: 2600},
    note: 'Timeleft - Meet New People, Timeleft X (Monthly)',
  });
});
