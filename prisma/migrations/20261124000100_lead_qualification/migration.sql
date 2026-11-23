CREATE TABLE "LeadQualification" (
    "reportId" TEXT NOT NULL,
    "generationAttempt" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "sourceIds" TEXT[],
    "evidence" JSONB NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadQualification_pkey" PRIMARY KEY ("reportId", "generationAttempt"),
    CONSTRAINT "LeadQualification_reportId_fkey" FOREIGN KEY ("reportId")
        REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadQualification_decision_check" CHECK ("decision" IN ('qualified', 'needs_evidence', 'rejected'))
);

ALTER TABLE "LeadQualification" ENABLE ROW LEVEL SECURITY;
