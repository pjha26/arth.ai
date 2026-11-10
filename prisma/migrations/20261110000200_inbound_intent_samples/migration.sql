ALTER TABLE "Lead" ADD COLUMN "intentSampledAt" TIMESTAMP(3);

ALTER TABLE "ReportEvent"
ADD COLUMN "intentModel" TEXT,
ADD COLUMN "intentMessageId" TEXT;
