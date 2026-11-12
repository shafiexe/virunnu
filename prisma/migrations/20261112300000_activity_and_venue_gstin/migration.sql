-- AlterTable
ALTER TABLE "CatererOrder" ADD COLUMN     "recordedBy" TEXT;

-- AlterTable
ALTER TABLE "CatererPayment" ADD COLUMN     "recordedBy" TEXT;

-- AlterTable
ALTER TABLE "CatererPurchase" ADD COLUMN     "recordedBy" TEXT;

-- AlterTable
ALTER TABLE "CatererPurchasePayment" ADD COLUMN     "recordedBy" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "recordedBy" TEXT;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "gstin" TEXT;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_orgId_at_idx" ON "ActivityLog"("orgId", "at");

