CREATE TABLE "ModelCall" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "operation" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostUSD" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelCall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ModelCall_reportId_idx" ON "ModelCall"("reportId");
CREATE INDEX "ModelCall_createdAt_idx" ON "ModelCall"("createdAt");
ALTER TABLE "ModelCall" ADD CONSTRAINT "ModelCall_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModelCall" ENABLE ROW LEVEL SECURITY;
