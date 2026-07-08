const APP_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { enrich } from "./services/enrichment.js";
import { generateAiReport } from "./services/aiReport.js";
import { generatePDF } from "./services/pdfGenerator.js";
import { sendEmail, sendSignalEmail } from "./services/emailService.js";
import { sendSlackNotification } from "./services/slack.js";
import { checkCompanySignals } from "./services/signals.js";
import { storeReportIntelligence } from "./services/vectorStore.js";
import { sheetsLog } from "./services/sheetsLogger.js";
import { driveUpload } from "./services/driveUploader.js";
import { learnFromReport, generateDeltaInsights } from "./services/selfLearning.js";
import { processFollowUp } from "./services/followupWorker.js";
import dotenv from "dotenv";
import pkg from "@prisma/client/index.js";
const { PrismaClient } = pkg;
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
const prisma = new PrismaClient({ log: ["error"] });

// Ensure the public/reports directory exists for local PDF storage
const REPORTS_DIR = path.resolve(__dirname, "../public/reports");
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  console.log("[arth.ai worker] Created reports directory:", REPORTS_DIR);
}

async function logStage(reportId, stageName, status, message = null) {
  try {
    await prisma.pipelineStage.create({
      data: { reportId, stage: stageName, status, message },
    });
  } catch (e) {
    console.error("Failed to log stage:", e.message);
  }
}

const connection = new IORedis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: process.env.UPSTASH_REDIS_URL?.startsWith("rediss://")
    ? { rejectUnauthorized: false }
    : undefined,
});

console.log("[arth.ai worker] Starting BullMQ worker...");

const worker = new Worker(
  "leads",
  async (job) => {
    const { leadInput: lead, companyId, reportId, jobId, submittedAt } = job.data;
    console.log(`\n[Job ${jobId}] Processing: ${lead.companyName}`);

    let driveLink = null;

    try {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: "processing" },
      });

      // ── Step 1: Enrich ──
      console.log(`[Job ${jobId}] Step 1/4: Enriching company data...`);
      await logStage(jobId, "enrich", "running");
      const enriched = await enrich(lead);
      await logStage(jobId, "enrich", "done");
      console.log(`[Job ${jobId}] Enrichment complete.`);

      // ── Step 2: AI Report ──
      console.log(`[Job ${jobId}] Step 2/4: Generating AI report...`);
      await logStage(jobId, "ai_report", "running");
      const report = await generateAiReport(lead, enriched, jobId, companyId);
      
      const programmaticDelta = await generateDeltaInsights(companyId, report, reportId);
      if (programmaticDelta) {
         report.programmaticDelta = programmaticDelta;
      }
      
      await logStage(jobId, "ai_report", "done");
      console.log(`[Job ${jobId}] AI report generated.`);

      // ── Step 3: PDF ──
      console.log(`[Job ${jobId}] Step 3/4: Generating PDF...`);
      await logStage(jobId, "pdf", "running");
      const pdfBuffer = await generatePDF(lead, enriched, report);

      // Persist the PDF locally so clients can download it directly
      const pdfPath = path.join(REPORTS_DIR, `${jobId}.pdf`);
      fs.writeFileSync(pdfPath, pdfBuffer);
      console.log(`[Job ${jobId}] PDF saved locally at ${pdfPath}`);

      await logStage(jobId, "pdf", "done");
      console.log(`[Job ${jobId}] PDF generated (${Math.round(pdfBuffer.length / 1024)} KB).`);

      // ── Step 4: Email (non-fatal — sandbox restrictions handled gracefully) ──
      console.log(`[Job ${jobId}] Step 4/4: Sending email...`);
      await logStage(jobId, "email", "running");
      try {
        await sendEmail(lead, pdfBuffer, report);
        await logStage(jobId, "email", "done");
        console.log(`[Job ${jobId}] Email sent to ${lead.email}.`);
      } catch (emailErr) {
        // Sandbox Resend limitation — don't fail the whole pipeline over this
        const isTestingRestriction =
          emailErr?.message?.toLowerCase().includes("testing") ||
          emailErr?.message?.toLowerCase().includes("sandbox") ||
          emailErr?.message?.toLowerCase().includes("not verified") ||
          emailErr?.statusCode === 403 ||
          emailErr?.statusCode === 422;

        if (isTestingRestriction) {
          console.warn(
            `[Job ${jobId}] Email skipped (Resend sandbox restriction): ${emailErr.message}`
          );
          await logStage(
            jobId,
            "email",
            "done",
            "Email skipped — Resend sandbox mode. PDF available for direct download."
          );
        } else {
          // Real email failure — log it but still mark job as done so the PDF is accessible
          console.error(`[Job ${jobId}] Email error (non-fatal):`, emailErr.message);
          await logStage(jobId, "email", "done", `Email failed: ${emailErr.message}`);
        }
      }

      // ── BONUS Step 5: Drive Upload ──
      try {
        if (process.env.GOOGLE_SHEETS_ID) {
          driveLink = await driveUpload(lead, pdfBuffer, jobId);
          console.log(`[Job ${jobId}] PDF uploaded to Drive: ${driveLink}`);
        }
      } catch (e) {
        console.warn(`[Job ${jobId}] Drive upload failed (non-critical):`, e.message);
      }

      // ── BONUS Step 6: Sheets Log ──
      try {
        if (process.env.GOOGLE_SHEETS_ID) {
          await sheetsLog(lead, "success", submittedAt, driveLink);
          console.log(`[Job ${jobId}] Logged to Google Sheets.`);
        }
      } catch (e) {
        console.warn(`[Job ${jobId}] Sheets log failed (non-critical):`, e.message);
      }

      // ── Step 7: Store Intelligence (RAG) ──
      try {
        await storeReportIntelligence(lead, report, companyId, reportId);
      } catch (e) {
        console.warn(`[Job ${jobId}] RAG vector storage failed:`, e.message);
      }

      // ── Step 8: Self-Learning Intelligence Layer ──
      try {
        await learnFromReport(report, companyId, lead);
      } catch (e) {
        console.warn(`[Job ${jobId}] Self-learning extraction failed:`, e.message);
      }

      await prisma.report.update({
        where: { id: reportId },
        data: { 
          status: "done",
          chatEnabled: true,
          aiSummary: report?.executiveSummary || null,
          insights: report || {},
          deltaInsights: report.programmaticDelta || report?.deltaInsights || null,
          generatedAt: new Date()
        },
      });
      
      // ── Stage 1 (Deliver): Notify & CRM Integration ──
      try {
        // 1. Notify the dashboard user by creating a Signal
        await prisma.signal.create({
          data: {
            companyId: companyId,
            type: "report_delivered",
            severity: "low",
            data: { 
              message: `Intelligence Report delivered to ${lead.email}`,
              reportId: reportId
            }
          }
        });
        
        // 2. Push to CRM webhook (if configured)
        if (process.env.CRM_WEBHOOK_URL) {
          console.log(`[Job ${jobId}] Pushing lead and intelligence data to CRM webhook...`);
          try {
            await fetch(process.env.CRM_WEBHOOK_URL, { 
              method: "POST", 
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lead, reportId }) 
            });
          } catch (err) {
            console.error(`[Job ${jobId}] Webhook failed:`, err.message);
          }
        }
        
        // 3. Start monitoring
        const monitoringQueue = new Queue("monitoring", { connection });
        await monitoringQueue.add("check-company", { companyId: companyId });
        console.log(`[Job ${jobId}] Dispatched 'start_monitoring' task for ${lead.companyName} to background queue.`);
        
        // 3.5 Start Follow-up Sequence Automation
        const followupsQueue = new Queue("followups", { connection });
        await followupsQueue.add("followup-stage-1", { leadId: lead.id, stage: 1 }, { delay: 2 * 24 * 60 * 60 * 1000 });
        await followupsQueue.add("followup-stage-2", { leadId: lead.id, stage: 2 }, { delay: 5 * 24 * 60 * 60 * 1000 });
        await followupsQueue.add("followup-stage-3", { leadId: lead.id, stage: 3 }, { delay: 10 * 24 * 60 * 60 * 1000 });
        console.log(`[Job ${jobId}] Enqueued follow-up sequence for ${lead.companyName}.`);
        
        // 4. Slack Notification
        await sendSlackNotification(`✅ Intelligence Report for *${lead.companyName}* is ready.\nView Dashboard: ${APP_URL}/dashboard/reports/${reportId}`);
        
      } catch (e) {
        console.error(`[Job ${jobId}] Failed Stage 1 Deliver Hooks:`, e.message);
      }

      console.log(`[Job ${jobId}] ✓ Pipeline complete for ${lead.companyName}\n`);
    } catch (err) {
      console.error(`[Job ${jobId}] ✗ Pipeline failed:`, err.message);

      await logStage(jobId, "error", "failed", err.message);
      await prisma.report.update({
        where: { id: reportId },
        data: { status: "failed" },
      });

      // Still try to log the failure to Sheets
      try {
        if (process.env.GOOGLE_SHEETS_ID) {
          await sheetsLog(lead, "failed", submittedAt, null);
        }
      } catch {}

      throw err; // Rethrow so BullMQ retries
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed.`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});

process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down gracefully...");
  await worker.close();
  await monitorWorker.close();
  await followupsWorker.close();
  process.exit(0);
});

// ── Background Monitoring Worker ──
const leadsQueue = new Queue("leads", { connection });

const monitorWorker = new Worker(
  "monitoring",
  async (job) => {
    const { companyId } = job.data;
    console.log(`[Monitor Worker] Checking signals for company: ${companyId}`);
    
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { reports: { orderBy: { createdAt: "desc" }, take: 1 } }
    });
    
    if (!company) return;
    
    const lastReport = company.reports[0];
    const signalResult = await checkCompanySignals(company, lastReport);
    
    if (signalResult.detectedSignal && signalResult.severity === "high") {
      console.log(`[Monitor Worker] HIGH SIGNAL DETECTED for ${company.name}: ${signalResult.message}`);
      
      // 1. Save Signal
      const signal = await prisma.signal.create({
        data: {
          companyId,
          type: signalResult.type || "other",
          severity: "high",
          data: { message: signalResult.message }
        }
      });
      
      // 2. Update Intent Score on latest report
      if (lastReport) {
        await prisma.report.update({
          where: { id: lastReport.id },
          data: { score: (lastReport.score || 0) + 20 }
        });
      }
      
      // 3. Auto-Trigger Regeneration (Re-audit)
      // Grab a lead associated with the company to use for the new report
      const latestLead = await prisma.lead.findFirst({ where: { companyId }, orderBy: { createdAt: "desc" }});
      
      if (latestLead) {
        const newReport = await prisma.report.create({
          data: { companyId, status: "pending" }
        });
        
        await leadsQueue.add("process-report", {
          leadInput: latestLead,
          companyId,
          reportId: newReport.id,
          jobId: newReport.id,
          submittedAt: new Date()
        });
        
        // 4. Send Email Alert
        await sendSignalEmail(latestLead, signal);
        
        // 5. Send Slack Alert
        await sendSlackNotification(`🔥 High Signal Detected for *${company.name}*\n${signalResult.message}\nView Dashboard: ${APP_URL}/dashboard`);
      }
    } else {
      console.log(`[Monitor Worker] No significant signals for ${company.name}`);
    }
  },
  { connection, concurrency: 2 }
);

monitorWorker.on("completed", (job) => console.log(`[Monitor] Job ${job.id} completed.`));
monitorWorker.on("failed", (job, err) => console.error(`[Monitor] Job ${job?.id} failed: ${err.message}`));

// ── Follow-up Sequence Worker ──
const followupsWorker = new Worker(
  "followups",
  processFollowUp,
  { connection, concurrency: 2 }
);

followupsWorker.on("completed", (job) => console.log(`[Followups] Job ${job.id} completed.`));
followupsWorker.on("failed", (job, err) => console.error(`[Followups] Job ${job?.id} failed: ${err.message}`));
