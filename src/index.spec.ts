import {createExecutionContext, env, waitOnExecutionContext} from 'cloudflare:test';
import {beforeEach, describe, expect, it, vi} from 'vitest';

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
    from: 'youremail@gmail.com',
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
  const exampleAction: LunchMoneyAction = {
    type: 'update',
    match: {expectedPayee: 'Example Payee', expectedTotal: 100},
    note: 'Updated note',
  };

  const exampleProcessor: EmailProcessor = {
    identifier: 'example',
    matchEmail: vi.fn(() => true),
    process: vi.fn(() => Promise.resolve(exampleAction)),
  };

  beforeEach(() => {
    overrideProcessors([exampleProcessor]);
  });

  it('processes fixture email and stores action in database', async () => {
    const ctx = createExecutionContext();

    const mockMessage = messageMock(fixtureEmail);
    worker.email!(mockMessage, env, ctx);

    await waitOnExecutionContext(ctx);

    const {results} = await env.DB.prepare('SELECT * FROM lunchmoney_actions').all();

    expect(results).toHaveLength(1);
    expect(results[0].action).toEqual(JSON.stringify(exampleAction));
  });
});
