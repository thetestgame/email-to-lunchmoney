import {createExecutionContext, env, waitOnExecutionContext} from 'cloudflare:test';
import {describe, expect, it} from 'vitest';

import worker from '../src/index';

import fixtureEmail from './fixtures/amazon.eml?raw';

describe('Email Handler', () => {
  it('processes fixture email without errors', async () => {
    const ctx = createExecutionContext();

    // Create a mock email message
    const mockMessage: ForwardableEmailMessage = {
      raw: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(fixtureEmail));
          controller.close();
        },
      }),
      rawSize: fixtureEmail.length,
      headers: new Headers({
        from: 'evanpurkhiser@gmail.com',
        to: 'lunchmoney-ingest@evanpurkhiser.com',
        subject: 'Test Email',
      }),
      from: 'evanpurkhiser@gmail.com',
      to: 'lunchmoney-ingest@evanpurkhiser.com',
      setReject: () => {},
    };

    // Test that the email handler doesn't throw an error
    await expect(worker.email?.(mockMessage, env, ctx)).resolves.not.toThrow();

    await waitOnExecutionContext(ctx);
  });
});
