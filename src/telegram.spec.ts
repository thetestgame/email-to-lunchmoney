import {env, fetchMock} from 'cloudflare:test';
import {afterEach, beforeAll, describe, it} from 'vitest';

import {sendTelegramMessage} from './telegram';

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => fetchMock.assertNoPendingInterceptors());

describe('sendTelegramMessage', () => {
  it('should send a message to Telegram API successfully', async () => {
    env.TELEGRAM_TOKEN = 'test_token_123';
    env.TELEGRAM_CHAT_ID = 'test_chat_id_456';

    const message = 'Test message with *markdown*';

    fetchMock
      .get('https://api.telegram.org')
      .intercept({
        path: '/bottest_token_123/sendMessage',
        method: 'POST',
      })
      .reply(200, {ok: true, result: {message_id: 123}});

    await sendTelegramMessage(env, message);
  });

  it('should skip sending when credentials are not configured', async () => {
    env.TELEGRAM_TOKEN = undefined;
    env.TELEGRAM_CHAT_ID = undefined;

    const message = 'Test message';

    await sendTelegramMessage(env, message);
  });

  it('should handle API errors gracefully', async () => {
    env.TELEGRAM_TOKEN = 'test_token';
    env.TELEGRAM_CHAT_ID = 'test_chat_id';

    const message = 'Test message';

    fetchMock
      .get('https://api.telegram.org')
      .intercept({
        path: '/bottest_token/sendMessage',
        method: 'POST',
      })
      .reply(400, {ok: false, error_code: 400, description: 'Bad Request'});

    await sendTelegramMessage(env, message);
  });
});
