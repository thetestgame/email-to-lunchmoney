import {createExecutionContext, env, waitOnExecutionContext} from 'cloudflare:test';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import fixtureEmail from '../fixtures/amazon.eml?raw';
import fixtureOrder from '../fixtures/amazon.json';

import * as amazonPrompt from './amazon/prompt';

const extractOrderSpy = vi.spyOn(amazonPrompt, 'extractOrder');

import worker from '../src/index';

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
  beforeEach(() => {
    extractOrderSpy.mockReturnValue(Promise.resolve(fixtureOrder));
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
