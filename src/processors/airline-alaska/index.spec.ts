import {env} from 'cloudflare:test';
import PostalMime from 'postal-mime';
import {expect, test} from 'vitest';

import {alaskaProcessor} from '.';

const testCases = [
  {
    file: 'receipt-1',
    expected: {
      type: 'update',
      match: {expectedPayee: 'Alaska Airlines', expectedTotal: 38660},
      note: 'EWR → SFO (IUZWKS)',
    },
  },
  {
    file: 'receipt-2',
    expected: {
      type: 'update',
      match: {expectedPayee: 'Alaska Airlines', expectedTotal: 27860},
      note: 'EWR → SFO (GPEHPG)',
    },
  },
];

test.for(testCases)('can process $file', async ({file, expected}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);

  const result = await alaskaProcessor.process(email, env);

  expect(result).toEqual(expected);
});

test.for(testCases)('does match $file', async ({file}) => {
  const emailFile = await import(`./fixtures/${file}.eml?raw`);
  const email = await PostalMime.parse(emailFile.default);
  expect(alaskaProcessor.matchEmail(email)).toBe(true);
});
