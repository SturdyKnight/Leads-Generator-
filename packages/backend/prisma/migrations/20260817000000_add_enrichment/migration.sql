-- AlterTable: Add new columns to leads
ALTER TABLE "leads" ADD COLUMN "mobile" TEXT;
ALTER TABLE "leads" ADD COLUMN "isChain" BOOLEAN;
ALTER TABLE "leads" ADD COLUMN "chainName" TEXT;
ALTER TABLE "leads" ADD COLUMN "outletCount" INTEGER;
ALTER TABLE "leads" ADD COLUMN "enrichmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "leads_enrichmentId_key" ON "leads"("enrichmentId");
CREATE INDEX "leads_isChain_idx" ON "leads"("isChain");

-- CreateTable: lead_enrichments
CREATE TABLE "lead_enrichments" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "isChain" BOOLEAN,
    "chainName" TEXT,
    "outletCount" INTEGER,
    "classification" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "websiteSummary" TEXT,
    "websiteTech" TEXT,
    "websiteContact" TEXT,
    "websiteIntelAt" TIMESTAMP(3),
    "outreachDraft" TEXT,
    "outreachDraftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_enrichments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_enrichments_leadId_key" ON "lead_enrichments"("leadId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_enrichmentId_fkey" FOREIGN KEY ("enrichmentId") REFERENCES "lead_enrichments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
