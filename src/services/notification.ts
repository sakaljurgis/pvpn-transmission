import { settings } from '../settings';

class NotificationService {
  async sendNotification(message: string, important = false) {
    const webhook = settings.discordWebhookUrl;
    if (!webhook) {
      return;
    }

    console.log(`Posting message to Discord: ${message}`);

    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: `${important ? '@here ' :''}${message}` }),
    });

    console.log(`Discord response: ${response.status}, rate limit remaining: ${response.headers.get('x-ratelimit-remaining')}, rate limit reset in: ${response.headers.get('x-ratelimit-reset-after')}s.`);
  }
}

export const notificationService = new NotificationService();
