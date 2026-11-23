CREATE TABLE "CatalogueCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryKey" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "regionKey" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cityKey" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "industryKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatalogueCompany_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogueCompany_domain_countryKey_regionKey_cityKey_key"
    ON "CatalogueCompany"("domain", "countryKey", "regionKey", "cityKey");
CREATE INDEX "CatalogueCompany_countryKey_cityKey_industryKey_idx"
    ON "CatalogueCompany"("countryKey", "cityKey", "industryKey");
ALTER TABLE "CatalogueCompany" ENABLE ROW LEVEL SECURITY;
