import { Worker } from "bullmq";
import IORedis from "ioredis";
import { enrich } from "./services/enrichment.js";
import { generateAiReport } from "./services/aiReport.js";
import { generatePDF } from "./services/pdfGenerator.js";
import { sendEmail } from "./services/emailService.js";
import { storeReportIntelligence } from "./services/vectorStore.js";
import { sheetsLog } from "./services/sheetsLogger.js";
import { driveUpload } from "./services/driveUploader.js";
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

async function logStage(leadId, stageName, status, message = null) {
  try {
    await prisma.pipelineStage.create({
      data: { leadId, stage: stageName, status, message },
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
    const { lead, jobId, submittedAt } = job.data;
    console.log(`\n[Job ${jobId}] Processing: ${lead.companyName}`);

    let driveLink = null;

    try {
      await prisma.lead.update({
        where: { id: jobId },
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
      const report = await generateAiReport(lead, enriched, jobId);
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
        await storeReportIntelligence(lead, report);
      } catch (e) {
        console.warn(`[Job ${jobId}] RAG vector storage failed:`, e.message);
      }

      await prisma.lead.update({
        where: { id: jobId },
        data: { 
          status: "done",
          aiSummary: report?.executiveSummary || null
        },
      });
      console.log(`[Job ${jobId}] ✓ Pipeline complete for ${lead.companyName}\n`);
    } catch (err) {
      console.error(`[Job ${jobId}] ✗ Pipeline failed:`, err.message);

      await logStage(jobId, "error", "failed", err.message);
      await prisma.lead.update({
        where: { id: jobId },
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
  process.exit(0);
});
