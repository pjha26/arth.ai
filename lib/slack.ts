export async function sendSlackNotification(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      console.warn(`[Slack] Failed to send message. Status: ${response.status}`);
    }
  } catch (error) {
    console.error(`[Slack] Error sending webhook:`, error);
  }
}
