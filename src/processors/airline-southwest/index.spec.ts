import {env} from 'cloudflare:test';
import PostalMime from 'postal-mime';
import {expect, test} from 'vitest';

import {southwestProcessor} from '.';

const testCases = [
  {
    file: 'receipt-1',
    expected: {
      type: 'update',
      match: {expectedPayee: 'Southwest Airlines', expectedTotal: 0},
      note: 'SJC → SNA (2CEPA9)',
    },
  },
  {
    file: 'receipt-2',
    expected: {
      type: 'update',
      match: {expectedPayee: 'Southwest Airlines', expectedTotal: 0},
      note: 'OAK → LAS (4474MV)',
    },
  },
];

test.for(testCases)('can process $file', async ({file, expected}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);

  const result = await southwestProcessor.process(email, env);

  expect(result).toEqual(expected);
});

test.for(testCases)('does match $file', async ({file}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);
  expect(southwestProcessor.matchEmail(email)).toBe(true);
});
