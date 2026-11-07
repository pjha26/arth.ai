import { Resend } from 'resend';
import { reportLink, unsubscribeLink } from '../../shared/access.js';
import { escapeHtml as h } from '../../shared/html.js';

export function buildEmailHtml(lead, report, reportId) {
  const link = h(reportLink(reportId, lead.id));
  const opportunity = report.aiOpportunities?.[0];
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;line-height:1.7">
    <h1>Your ArthAI report for ${h(lead.companyName)}</h1><p>Hi ${h(lead.fullName || 'there')},</p>
    <p>${h(report.executiveSummary)}</p>
    ${opportunity ? `<h2>${h(opportunity.title)}</h2><p>${h(opportunity.description)}</p>` : ''}
    <p>${h(report.verificationNote || 'AI-reviewed analysis. Recommendations are assessments, not promised results.')}</p>
    <p><a href="${link}">Open your private report, download its PDF, and chat</a></p>
    <p>This link grants access to your report for seven days. Forward it only to people you want to share the report with.</p>
    <p><a href="${h(unsubscribeLink(lead.id))}">Unsubscribe from future outreach</a></p></div>`;
}

export async function sendEmail(lead, pdfBuffer, report, reportId) {
  if (!lead.email || !reportId || !lead.id) throw new Error('Email requires a recipient, lead ID, and report ID');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'ArthAI Reports <onboarding@resend.dev>', to: lead.email,
    replyTo: process.env.EMAIL_REPLY_TO, subject: `Your intelligence report — ${lead.companyName}`,
    html: buildEmailHtml(lead, report, reportId),
    attachments: [{ filename: 'arthai-report.pdf', content: pdfBuffer }],
  }, { idempotencyKey: `report-${reportId}` });
  if (error || !data?.id) throw new Error(error?.message || 'Email provider did not accept the message');
  return data;
}

export async function sendFollowUpEmail(report, stage) {
  const lead = report.lead;
  if (!lead?.email || !report.id || ![1, 2, 3].includes(stage)) throw new Error('Invalid follow-up recipient or stage');
  const opportunity = report.insights?.aiOpportunities?.[0];
  const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.EMAIL_FROM || 'ArthAI Reports <onboarding@resend.dev>', to: lead.email, replyTo: process.env.EMAIL_REPLY_TO,
    subject: `Your ${report.company.name} report: next steps`,
    html: `<p>Hi ${h(lead.fullName || 'there')},</p><p>${h(opportunity ? `Would you like to discuss the recommendation: ${opportunity.title}?` : 'Did you find your intelligence report useful?')}</p><p><a href="${h(reportLink(report.id, lead.id))}">Review the report</a></p><p><a href="${h(unsubscribeLink(lead.id))}">Unsubscribe</a></p>`,
  }, { idempotencyKey: `followup-${report.id}-${stage}` });
  if (error || !data?.id) throw new Error(error?.message || 'Follow-up was not accepted');
  return data;
}
