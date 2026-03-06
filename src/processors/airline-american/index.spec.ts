import {env} from 'cloudflare:test';
import PostalMime from 'postal-mime';
import {expect, test} from 'vitest';

import {americanProcessor} from '.';

const testCases = [
  {
    file: 'receipt-1',
    expected: {
      type: 'update',
      match: {expectedPayee: 'American Airlines', expectedTotal: 12881},
      note: 'SFO → SHV (EIKCON)',
    },
  },
  {
    file: 'receipt-2',
    expected: {
      type: 'update',
      match: {expectedPayee: 'American Airlines', expectedTotal: 23020},
      note: 'BUR → ORD (DMWZHJ)',
    },
  },
];

test.for(testCases)('can process $file', async ({file, expected}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);

  const result = await americanProcessor.process(email, env);

  expect(result).toEqual(expected);
});

test.for(testCases)('does match $file', async ({file}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);
  expect(americanProcessor.matchEmail(email)).toBe(true);
});
