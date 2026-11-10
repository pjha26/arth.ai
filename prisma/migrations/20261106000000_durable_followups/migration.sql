CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FollowUp_stage_check" CHECK ("stage" BETWEEN 1 AND 3)
);
CREATE UNIQUE INDEX "FollowUp_reportId_stage_key" ON "FollowUp"("reportId", "stage");
CREATE INDEX "FollowUp_status_dueAt_idx" ON "FollowUp"("status", "dueAt");
CREATE INDEX "FollowUp_status_startedAt_idx" ON "FollowUp"("status", "startedAt");
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ENABLE ROW LEVEL SECURITY;

-- Historical reports are not enrolled in new outreach automatically.
