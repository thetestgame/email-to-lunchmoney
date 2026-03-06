import {env} from 'cloudflare:test';
import PostalMime from 'postal-mime';
import {expect, test} from 'vitest';

import {unitedProcessor} from '.';

const testCases = [
  {
    file: 'receipt-1',
    expected: {
      type: 'update',
      match: {expectedPayee: 'United Airlines', expectedTotal: 35566},
      note: 'EWR → SFO (ORCQG9)',
    },
  },
  {
    file: 'receipt-2',
    expected: {
      type: 'update',
      match: {expectedPayee: 'United Airlines', expectedTotal: 67263},
      note: 'EWR → SFO (BPXC7T)',
    },
  },
];

test.for(testCases)('can process $file', async ({file, expected}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);

  const result = await unitedProcessor.process(email, env);

  expect(result).toEqual(expected);
});

test.for(testCases)('does match $file', async ({file}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);
  expect(unitedProcessor.matchEmail(email)).toBe(true);
});
