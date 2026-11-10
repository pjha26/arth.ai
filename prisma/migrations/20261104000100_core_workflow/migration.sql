-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "challengeTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "intentModel" TEXT,
ADD COLUMN     "intentScoredAt" TIMESTAMP(3),
ADD COLUMN     "legacyIntentProbability" DOUBLE PRECISION,
ADD COLUMN     "outreachConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "personaType" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "salesStatus" TEXT NOT NULL DEFAULT 'new';

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "artifactStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "deliveryStartedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "generationAttempt" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "legacyScore" INTEGER,
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "requestFingerprint" TEXT,
ADD COLUMN     "requestKey" TEXT,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'unverified';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "actor" TEXT NOT NULL DEFAULT 'legacy';

-- CreateTable
CREATE TABLE "ReportSource" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ReportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportEvent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportSource_reportId_idx" ON "ReportSource"("reportId");

-- CreateIndex
CREATE INDEX "ReportEvent_reportId_type_idx" ON "ReportEvent"("reportId", "type");

-- CreateIndex
CREATE INDEX "ReportEvent_createdAt_type_idx" ON "ReportEvent"("createdAt", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Report_requestKey_key" ON "Report"("requestKey");

-- CreateIndex
CREATE INDEX "Report_status_dispatchedAt_idx" ON "Report"("status", "dispatchedAt");

-- CreateIndex
CREATE INDEX "Report_leadId_createdAt_idx" ON "Report"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Embedding_reportId_idx" ON "Embedding"("reportId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSource" ADD CONSTRAINT "ReportSource_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEvent" ADD CONSTRAINT "ReportEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve engagement-derived values; do not label them validated readiness or intent.
UPDATE "Report" SET "legacyScore" = "score", "score" = NULL, "personaType" = lower("personaType"), "deliveryStatus" = 'legacy';
UPDATE "Lead" SET "legacyIntentProbability" = "intentProbability", "intentProbability" = NULL;
