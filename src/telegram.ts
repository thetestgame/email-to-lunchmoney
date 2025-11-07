/**
 * Send a message via Telegram
 */
export async function sendTelegramMessage(env: Env, message: string): Promise<void> {
  const token = env.TELEGRAM_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram credentials not configured, skipping notification');
    return;
  }

  const data = {
    text: message,
    chat_id: chatId,
    parse_mode: 'MarkdownV2',
  };

  const options: RequestInit = {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {'content-type': 'application/json'},
  };

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    options
  );

  if (!response.ok) {
    console.error('Failed to send Telegram message:', await response.text());
  }
}
