const APP_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
import { Resend } from "resend";

export async function sendEmail(lead, pdfBuffer, report) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM_EMAIL = process.env.EMAIL_FROM || "arth.ai Reports <onboarding@resend.dev>";
  const REPLY_TO = process.env.EMAIL_REPLY_TO || "hello@arth.ai";
  
  const scores = report.auditScores;
  const overall = Math.round(
    (scores.digitalReadiness + scores.automationPotential + scores.growthIndex) / 3
  );
  const topOpportunity = report.aiOpportunities?.[0];
  const delta = report.programmaticDelta;

  const html = buildEmailHtml(lead, report, scores, overall, topOpportunity, delta);

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

function buildEmailHtml(lead, report, scores, overall, topOpportunity, delta) {
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

      <!-- Change Detection / Delta Insights -->
      ${delta ? `
      <div style="border:1px solid #10b981;padding:16px 20px;background:rgba(16,185,129,0.05);border-radius:10px;margin-bottom:28px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10b981;margin-bottom:12px;">Since Your Last Audit</div>
        <ul style="font-size:13px;color:#f1f0ff;line-height:1.7;margin:0;padding-left:16px;">
          ${delta.newlyAdoptedTech.length > 0 ? `<li style="margin-bottom:4px;">✅ Adopted new tech: <strong>${delta.newlyAdoptedTech.join(', ')}</strong></li>` : ''}
          ${delta.newSignalsDetected.length > 0 ? `<li style="margin-bottom:4px;">✅ New market signals detected: <strong>${delta.newSignalsDetected.join(', ')}</strong></li>` : ''}
          ${delta.droppedTech.length > 0 ? `<li style="margin-bottom:4px;">⚠️ Dropped tech: <strong>${delta.droppedTech.join(', ')}</strong></li>` : ''}
        </ul>
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

      <!-- CTAs -->
      <div style="text-align:center;margin-bottom:20px;display:flex;flex-direction:column;gap:12px;align-items:center;">
        <a href="${APP_URL}/report/${report.id}" 
           style="display:inline-block;padding:14px 36px;border-radius:100px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:14px;font-weight:700;text-decoration:none;width:100%;max-width:300px;">
          💬 Chat With Your Report
        </a>
        <a href="${APP_URL}/api/leads/${lead.id}/download" 
           style="display:inline-block;padding:12px 36px;border-radius:100px;background:rgba(255,255,255,0.05);color:#f1f0ff;border:1px solid rgba(255,255,255,0.1);font-size:14px;font-weight:600;text-decoration:none;width:100%;max-width:300px;">
          📄 Download PDF
        </a>
      </div>
      
      <!-- Secondary Actions -->
      <div style="text-align:center;margin-bottom:40px;font-size:13px;">
        <a href="mailto:?subject=AI Intelligence Report for ${encodeURIComponent(lead.companyName)}&body=Hey team,%0D%0A%0D%0AHere is the AI intelligence report generated by arth.ai for ${encodeURIComponent(lead.companyName)}:%0D%0A${APP_URL}/report/${report.id}" style="color:#a5b4fc;text-decoration:none;margin-right:16px;">
          Share with your team ↗
        </a>
        <a href="mailto:${process.env.EMAIL_REPLY_TO || 'hello@arth.ai'}?subject=Re: AI Report for ${encodeURIComponent(lead.companyName)}" style="color:#a5b4fc;text-decoration:none;">
          Reply to Discuss ↗
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

export async function sendSignalEmail(lead, signal) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM_EMAIL = process.env.EMAIL_FROM || "arth.ai Signals <onboarding@resend.dev>";
  const REPLY_TO = process.env.EMAIL_REPLY_TO || "hello@arth.ai";
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>🔥 New Signal Detected for ${lead.companyName}</h2>
      <p>We've detected a significant update to ${lead.companyName}'s intelligence profile.</p>
      <div style="border-left: 4px solid #E85D04; padding-left: 16px; margin: 20px 0;">
        <p><strong>Type:</strong> ${signal.type}</p>
        <p><strong>Details:</strong> ${signal.data.message}</p>
      </div>
      <p>Their intelligence report is currently being re-audited and updated.</p>
      <a href="${APP_URL}/dashboard" style="display:inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">View on Dashboard</a>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: lead.email,
      replyTo: REPLY_TO,
      subject: `🔥 Signal Update: ${lead.companyName} | arth.ai`,
      html,
    });
  } catch (err) {
    console.error("Failed to send signal email:", err.message);
  }
}
