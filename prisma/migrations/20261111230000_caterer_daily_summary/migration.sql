-- AlterTable
ALTER TABLE "Caterer" ADD COLUMN     "lastSummaryOn" DATE,
ADD COLUMN     "summaryEmail" TEXT,
ADD COLUMN     "summaryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "summaryVia" TEXT NOT NULL DEFAULT 'WHATSAPP';

