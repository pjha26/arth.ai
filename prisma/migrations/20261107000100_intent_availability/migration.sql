ALTER TABLE "Lead" ADD COLUMN "intentStatus" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN "intentAlertedAt" TIMESTAMP(3);
UPDATE "Lead" SET "intentStatus" = 'scored' WHERE "intentProbability" IS NOT NULL;
