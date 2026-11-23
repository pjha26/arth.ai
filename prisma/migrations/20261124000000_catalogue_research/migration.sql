ALTER TABLE "CatalogueCompany" ADD COLUMN "shortlistedAt" TIMESTAMP(3),
ADD COLUMN "researchSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "researchReportId" TEXT;

CREATE UNIQUE INDEX "CatalogueCompany_researchReportId_key"
    ON "CatalogueCompany"("researchReportId");

ALTER TABLE "CatalogueCompany" ADD CONSTRAINT "CatalogueCompany_researchReportId_fkey"
    FOREIGN KEY ("researchReportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
