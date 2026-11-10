export const isResearchActive = status => ['pending', 'processing'].includes(status);

export function shouldPollReport(status, deliveryStatus) {
  return isResearchActive(status) || status === 'done' && ['pending', 'sending'].includes(deliveryStatus);
}

export function deliveryCopy(status) {
  const messages = {
    delivered: 'Email delivery has been confirmed.',
    accepted: 'Email accepted. Delivery has not been confirmed yet; refresh for the latest status.',
    pending: 'Your report is ready here. Email delivery is waiting to be sent.',
    sending: 'Your report is ready here. Email dispatch is in progress.',
    skipped: 'Your report is ready here. No email was sent.',
    uncertain: 'Email delivery needs a team review. Your report remains available here.',
    bounced: 'The email bounced. Your report remains available here.',
    failed: 'Email delivery failed. Your report remains available here.',
  };
  return messages[status] || 'Your report is available here. Email status is not confirmed.';
}
