import {env, fetchMock} from 'cloudflare:test';
import {afterEach, beforeAll, describe, it} from 'vitest';

import {sendDiscordMessage} from './discord';

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => fetchMock.assertNoPendingInterceptors());

describe('sendDiscordMessage', () => {
  it('should send a message to Discord webhook successfully', async () => {
    env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/123/test-webhook-token';

    const message = 'Test message';

    fetchMock
      .get('https://discord.com')
      .intercept({
        path: '/api/webhooks/123/test-webhook-token',
        method: 'POST',
      })
      .reply(204);

    await sendDiscordMessage(env, message);
  });

  it('should skip sending when webhook URL is not configured', async () => {
    env.DISCORD_WEBHOOK_URL = undefined;

    const message = 'Test message';

    await sendDiscordMessage(env, message);
  });

  it('should handle webhook errors gracefully', async () => {
    env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/123/test-webhook-token';

    const message = 'Test message';

    fetchMock
      .get('https://discord.com')
      .intercept({
        path: '/api/webhooks/123/test-webhook-token',
        method: 'POST',
      })
      .reply(400, {message: 'Bad Request'});

    await sendDiscordMessage(env, message);
  });
});
