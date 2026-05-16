import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || "arth.ai Reports <onboarding@resend.dev>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || "hello@arth.ai";

/**
 * Sends the audit report PDF to the prospect via Resend.
 */
export async function sendEmail(lead, pdfBuffer, report) {
  const scores = report.auditScores;
  const overall = Math.round(
    (scores.digitalReadiness + scores.automationPotential + scores.growthIndex) / 3
  );
  const topOpportunity = report.aiOpportunities?.[0];

  const html = buildEmailHtml(lead, report, scores, overall, topOpportunity);

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: lead.email,
    replyTo: REPLY_TO,
    subject: `Your AI Intelligence Report — ${lead.companyName} | arth.ai`,
    html,
    attachments: [
      {
        filename: `${lead.companyName.replace(/[^a-z0-9]/gi, "-")}-arth-ai-audit.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return data;
}

function buildEmailHtml(lead, report, scores, overall, topOpportunity) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Your AI Report — ${lead.companyName}</title>
</head>
<body style="margin:0;padding:0;background:#07070f;font-family:'Helvetica Neue',Arial,sans-serif;color:#f1f0ff;">
  <div style="max-width:600px;margin:0 auto;background:#07070f;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d0a2e 0%,#07070f 100%);padding:36px 40px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;letter-spacing:-0.04em;background:linear-gradient(135deg,#a5b4fc,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px;">
        arth.ai
      </div>
      <div style="font-size:11px;color:#5a5880;text-transform:uppercase;letter-spacing:0.1em;">AI-Powered Inbound Personalization</div>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <p style="font-size:15px;color:#9b99c0;margin-bottom:8px;">Hi ${lead.fullName},</p>
      <h1 style="font-size:26px;font-weight:700;letter-spacing:-0.02em;margin-bottom:16px;line-height:1.2;">
        Your AI Intelligence Report<br/>
        <span style="background:linear-gradient(135deg,#a5b4fc,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">for ${lead.companyName} is ready.</span>
      </h1>
      <p style="font-size:14px;color:#9b99c0;line-height:1.7;margin-bottom:32px;">
        We've analyzed <strong style="color:#f1f0ff;">${lead.companyName}</strong> across multiple data sources and run it through our AI engine. Your personalized audit report is attached to this email as a PDF.
      </p>

      <!-- Score Strip -->
      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:14px;padding:24px;margin-bottom:28px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:16px;">Your AI Readiness Scores</div>
        <div style="display:flex;gap:16px;justify-content:space-around;text-align:center;">
          ${[
            ["Overall", overall],
            ["Digital Readiness", scores.digitalReadiness],
            ["Automation Potential", scores.automationPotential],
            ["Growth Index", scores.growthIndex],
          ]
            .map(
              ([label, val]) => `
          <div>
            <div style="font-size:32px;font-weight:800;background:linear-gradient(135deg,#a5b4fc,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;">${val}</div>
            <div style="font-size:9px;color:#5a5880;text-transform:uppercase;letter-spacing:0.06em;margin-top:4px;">${label}</div>
          </div>`
            )
            .join("")}
        </div>
      </div>

      <!-- Top Insight -->
      ${topOpportunity ? `
      <div style="border-left:3px solid #6366f1;padding:16px 20px;background:rgba(255,255,255,0.03);border-radius:0 10px 10px 0;margin-bottom:28px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6366f1;margin-bottom:6px;">Top AI Opportunity Identified</div>
        <div style="font-size:14px;font-weight:700;color:#f1f0ff;margin-bottom:6px;">${topOpportunity.title}</div>
        <p style="font-size:13px;color:#9b99c0;line-height:1.65;margin:0;">${topOpportunity.description}</p>
      </div>` : ""}

      <!-- Summary excerpt -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 22px;margin-bottom:28px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9b99c0;margin-bottom:10px;">Executive Summary</div>
        <p style="font-size:13px;color:#9b99c0;line-height:1.7;margin:0;">${report.executiveSummary}</p>
      </div>

      <p style="font-size:13px;color:#9b99c0;margin-bottom:8px;">
        📎 <strong style="color:#f1f0ff;">The full report is attached</strong> — open the PDF to see your complete AI Readiness score breakdown, pain point analysis, all ${report.aiOpportunities?.length || 4} AI automation opportunities, and recommended next steps.
      </p>

      <p style="font-size:13px;color:#9b99c0;margin-bottom:32px;line-height:1.7;">
        Have questions about your report or want to discuss how arth.ai can help implement these opportunities? Just reply to this email.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:40px;">
        <a href="mailto:${process.env.EMAIL_REPLY_TO || 'hello@arth.ai'}?subject=Re: AI Report for ${encodeURIComponent(lead.companyName)}" 
           style="display:inline-block;padding:14px 36px;border-radius:100px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:14px;font-weight:700;text-decoration:none;">
          Reply to Discuss Your Report →
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;text-align:center;">
        <div style="font-size:16px;font-weight:700;color:#6366f1;margin-bottom:4px;">arth.ai</div>
        <div style="font-size:11px;color:#5a5880;">AI-powered inbound personalization platform</div>
        <div style="font-size:10px;color:#3a3860;margin-top:12px;">
          This report was generated automatically for ${lead.companyName} by arth.ai's autonomous pipeline.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
