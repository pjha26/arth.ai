import { Resend } from "resend";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pkg from "@prisma/client/index.js";
const { PrismaClient } = pkg;

const prisma = new PrismaClient({ log: ["error"] });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);

export async function processFollowUp(job) {
  const { leadId, stage } = job.data;
  console.log(`[Follow-up] Processing stage ${stage} for lead: ${leadId}`);

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        company: {
          include: {
            reports: { orderBy: { createdAt: "desc" }, take: 1 }
          }
        }
      }
    });

    if (!lead) {
      console.log(`[Follow-up] Lead ${leadId} not found, skipping.`);
      return;
    }

    if (lead.unsubscribed) {
      console.log(`[Follow-up] Lead ${lead.email} unsubscribed, skipping.`);
      return;
    }

    if (lead.followUpStage >= stage) {
      console.log(`[Follow-up] Lead ${lead.email} already received stage ${stage} or higher, skipping.`);
      return;
    }

    const report = lead.company?.reports?.[0];
    if (!report) {
      console.log(`[Follow-up] No report found for ${lead.companyName}, skipping.`);
      return;
    }

    const insights = report.insights || {};
    const topOpportunity = insights.aiOpportunities?.[0];

    // Generate personalized email body with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    let prompt = `
      You are writing a follow-up email from 'arth.ai' to a B2B prospect named ${lead.fullName} at ${lead.companyName}.
      This is follow-up email #${stage} after we sent them an automated AI Intelligence Report.
      Keep it strictly to 3 sentences. Be extremely concise, casual, and value-driven. Do not use generic greetings or sign-offs, just provide the body text.
    `;

    if (topOpportunity) {
      prompt += `\nRefer specifically to this opportunity we found for them: "${topOpportunity.title}". Mention how we can help them implement it.`;
    } else {
      prompt += `\nAsk them if they found their AI Intelligence Report useful and if they want to chat about it.`;
    }

    const result = await model.generateContent(prompt);
    const bodyText = result.response.text().trim();

    // Assemble HTML
    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM_EMAIL = process.env.EMAIL_FROM || "arth.ai Reports <onboarding@resend.dev>";
    const REPLY_TO = process.env.EMAIL_REPLY_TO || "hello@arth.ai";
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <p>Hi ${lead.fullName},</p>
        <p>${bodyText.replace(/\n/g, '<br/>')}</p>
        <p>
          <a href="${APP_URL}/report/${report.id}" style="color: #6366f1; text-decoration: none;">
            <strong>Click here to view your interactive AI Report again</strong>
          </a>
        </p>
        <p>Best,<br/>The arth.ai Team</p>
        
        <hr style="border: 0; border-top: 1px solid #eaeaea; margin-top: 40px; margin-bottom: 20px;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          <a href="${APP_URL}/api/unsubscribe?leadId=${lead.id}" style="color: #999; text-decoration: underline;">Unsubscribe from follow-ups</a>
        </p>
      </div>
    `;

    // Send email
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: lead.email,
        replyTo: REPLY_TO,
        subject: `Quick question about your AI Report (${lead.companyName})`,
        html,
      });
      console.log(`[Follow-up] Successfully sent stage ${stage} to ${lead.email}`);
    } catch (emailErr) {
      const isTestingRestriction =
        emailErr?.message?.toLowerCase().includes("testing") ||
        emailErr?.message?.toLowerCase().includes("sandbox") ||
        emailErr?.message?.toLowerCase().includes("not verified") ||
        emailErr?.statusCode === 403 ||
        emailErr?.statusCode === 422;

      if (isTestingRestriction) {
        console.warn(`[Follow-up] Email skipped (Resend sandbox restriction): ${emailErr.message}`);
      } else {
        throw emailErr;
      }
    }

    // Update state
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        followUpStage: stage,
        lastFollowUpSentAt: new Date()
      }
    });

  } catch (err) {
    console.error(`[Follow-up] Error processing stage ${stage} for lead ${leadId}:`, err);
    throw err;
  }
}
