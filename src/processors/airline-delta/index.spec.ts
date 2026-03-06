import {env} from 'cloudflare:test';
import PostalMime from 'postal-mime';
import {expect, test} from 'vitest';

import {deltaProcessor} from '.';

const testCases = [
  {
    file: 'receipt-1',
    expected: {
      type: 'update',
      match: {expectedPayee: 'Delta Air Lines', expectedTotal: 54680},
      note: 'NYC-KENNEDY → SAN FRANCISCO (GFQWNR)',
    },
  },
];

test.for(testCases)('can process $file', async ({file, expected}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);

  const result = await deltaProcessor.process(email, env);

  expect(result).toEqual(expected);
});

test.for(testCases)('does match $file', async ({file}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);
  expect(deltaProcessor.matchEmail(email)).toBe(true);
});

test('ignores non-USD currency receipts', async () => {
  const emailFile = await import('./fixtures/receipt-2.eml?raw');
  const email = await PostalMime.parse(emailFile.default);

  // Should match the email (it's from Delta with correct subject)
  expect(deltaProcessor.matchEmail(email)).toBe(true);

  // But should return null when processing (CAD receipt, not USD)
  const result = await deltaProcessor.process(email, env);
  expect(result).toBeNull();
});
