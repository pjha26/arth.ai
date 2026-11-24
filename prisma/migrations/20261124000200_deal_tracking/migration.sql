CREATE TABLE "Deal" (
    "id" TEXT PRIMARY KEY,
    "leadId" TEXT NOT NULL REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "reportId" TEXT REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "qualificationReviewedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'open',
    "nextAction" TEXT,
    "nextActionOn" DATE,
    "outcomeReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deal_stage_state_check" CHECK (
        ("stage" = 'open' AND "nextAction" IS NOT NULL AND "outcomeReason" IS NULL AND "closedAt" IS NULL)
        OR ("stage" IN ('won', 'lost') AND "nextAction" IS NULL AND "nextActionOn" IS NULL AND "outcomeReason" IS NOT NULL AND "closedAt" IS NOT NULL)
    )
);
CREATE INDEX "Deal_createdAt_id_idx" ON "Deal"("createdAt", "id");
CREATE INDEX "Deal_leadId_idx" ON "Deal"("leadId");
CREATE INDEX "Deal_reportId_idx" ON "Deal"("reportId");

CREATE TABLE "DealActivity" (
    "dealId" TEXT NOT NULL REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "version" INTEGER NOT NULL,
    "actor" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "nextAction" TEXT,
    "nextActionOn" DATE,
    "outcomeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("dealId", "version")
);

ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealActivity" ENABLE ROW LEVEL SECURITY;
