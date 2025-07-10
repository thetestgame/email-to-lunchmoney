import {createExecutionContext, env, waitOnExecutionContext} from 'cloudflare:test';
import {beforeEach, describe, it, vi} from 'vitest';

import fixtureEmail from './fixtures/example.eml?raw';
import worker, {overrideProcessors} from './index';
import {EmailProcessor, LunchMoneyAction} from './types';

function messageMock(content: string): ForwardableEmailMessage {
  const raw = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });

  const message: ForwardableEmailMessage = {
    from: 'evanpurkhiser@gmail.com',
    to: 'lunchmoney-details@evanpurkhiser.com',
    raw,
    headers: new Headers(),
    rawSize: content.length,
    setReject: vi.fn(),
    forward: vi.fn(),
    reply: vi.fn(),
  };

  return message;
}

describe('Email Handler', () => {
  const exampleProcessor: EmailProcessor = {
    identifier: 'example',
    matchEmail: vi.fn(() => true),
    process: vi.fn(() => {
      const action: LunchMoneyAction = {
        type: 'update',
        match: {expectedPayee: 'Example Payee', expectedTotal: 100},
        note: 'Updated note',
      };

      return Promise.resolve(action);
    }),
  };

  beforeEach(() => {
    overrideProcessors([exampleProcessor]);
  });

  it('processes fixture email and stores action in database', async () => {
    const ctx = createExecutionContext();

    // Create a mock email message
    const mockMessage = messageMock(fixtureEmail);

    // Process the email
    worker.email?.(mockMessage, env, ctx);

    await waitOnExecutionContext(ctx);
  });
});
