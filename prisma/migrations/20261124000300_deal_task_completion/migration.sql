ALTER TABLE "Deal" ADD COLUMN "nextActionCompletedAt" TIMESTAMP(3),
    ADD CONSTRAINT "Deal_completed_action_check" CHECK ("nextActionCompletedAt" IS NULL OR "stage" = 'open');

ALTER TABLE "DealActivity" ADD COLUMN "nextActionCompletedAt" TIMESTAMP(3);

CREATE INDEX "Deal_stage_nextActionCompletedAt_nextActionOn_idx"
    ON "Deal" ("stage", "nextActionCompletedAt", "nextActionOn");
