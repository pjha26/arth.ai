export async function sendSlackNotification(message) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return { status: 'skipped', error: 'Slack webhook is not configured' };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (response.ok) return { status: 'sent' };
    const error = `Slack webhook returned HTTP ${response.status}`;
    console.warn(error);
    if (response.status === 429) {
      const seconds = Number(response.headers.get('retry-after'));
      const retryAfterMs = Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 86400 ? seconds * 1000 : null;
      return { status: 'failed', error, retryAfterMs };
    }
    return { status: response.status >= 500 || response.status === 408 ? 'uncertain' : 'failed', error };
  } catch {
    const error = 'Slack webhook did not confirm delivery';
    console.warn(error);
    return { status: 'uncertain', error };
  }
}
