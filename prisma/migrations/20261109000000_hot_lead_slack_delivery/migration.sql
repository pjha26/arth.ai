ALTER TABLE "ReportEvent"
ADD COLUMN "slackStatus" TEXT,
ADD COLUMN "slackScore" DOUBLE PRECISION,
ADD COLUMN "slackDueAt" TIMESTAMP(3),
ADD COLUMN "slackAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "slackError" TEXT;

CREATE INDEX "ReportEvent_slackStatus_slackDueAt_idx" ON "ReportEvent"("slackStatus", "slackDueAt");
