import { appUrl } from '../../shared/access.js';
import { sendSlackNotification } from './slack.js';

export async function reconcileIntentSlack(prisma) {
  const now = new Date();
  await prisma.reportEvent.updateMany({
    where: { slackStatus: 'sending', slackDueAt: { lte: now } },
    data: { slackStatus: 'uncertain', slackDueAt: null, slackError: 'Worker interrupted during Slack dispatch' },
  });
  const ready = { slackStatus: 'pending', slackDueAt: { lte: now } };
  const alerts = await prisma.reportEvent.findMany({
    where: ready, orderBy: { slackDueAt: 'asc' }, take: 10,
    select: { id: true, reportId: true, slackScore: true, slackAttempts: true, report: { select: { company: { select: { name: true } } } } },
  });
  for (const alert of alerts) {
    const company = alert.report.company.name.replace(/[&<>]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]);
    const message = `Experimental intent signal for ${company}: ${(alert.slackScore * 100).toFixed(0)}%. Review before outreach: ${appUrl()}/dashboard/reports/${alert.reportId}`;
    const claimed = await prisma.reportEvent.updateMany({
      where: { id: alert.id, ...ready, slackAttempts: alert.slackAttempts },
      data: { slackStatus: 'sending', slackDueAt: new Date(Date.now() + 10 * 60000), slackAttempts: { increment: 1 } },
    });
    if (!claimed.count) continue;

    const result = await sendSlackNotification(message);
    // A rate-limit rejection can be retried. Ambiguous outcomes may already have posted.
    const retry = typeof result.retryAfterMs === 'number' && alert.slackAttempts < 2;
    await prisma.reportEvent.updateMany({
      where: { id: alert.id, slackStatus: 'sending' },
      data: {
        slackStatus: retry ? 'pending' : result.status,
        slackDueAt: retry ? new Date(Date.now() + result.retryAfterMs) : null,
        slackError: result.error ?? null,
      },
    });
    if (result.retryAfterMs !== undefined) break;
  }
}
