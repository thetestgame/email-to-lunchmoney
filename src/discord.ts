/**
 * Send a message via Discord webhook
 */
export async function sendDiscordMessage(env: Env, message: string): Promise<void> {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured, skipping notification');
    return;
  }

  const data = {
    content: message,
  };

  const options: RequestInit = {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {'content-type': 'application/json'},
  };

  const response = await fetch(webhookUrl, options);

  if (!response.ok) {
    console.error('Failed to send Discord message:', await response.text());
  }
}
