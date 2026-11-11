-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('FOOD', 'SERVICE');

-- DropForeignKey
ALTER TABLE "CatererOrderLine" DROP CONSTRAINT "CatererOrderLine_orderId_fkey";

-- DropForeignKey
ALTER TABLE "CatererPayment" DROP CONSTRAINT "CatererPayment_orderId_fkey";

-- DropIndex
DROP INDEX "CatererOrder_catererId_number_key";

-- AlterTable
ALTER TABLE "Caterer" DROP COLUMN "nextOrderNumber",
ADD COLUMN     "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "CatererOrder" DROP COLUMN "customerName",
DROP COLUMN "customerPhone",
DROP COLUMN "discountPaise",
DROP COLUMN "discountReason",
DROP COLUMN "number",
DROP COLUMN "orgId",
DROP COLUMN "receivedPaise",
DROP COLUMN "subtotalPaise",
ADD COLUMN     "customerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CatererOrderLine" DROP COLUMN "orderId",
ADD COLUMN     "billId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CatererPayment" DROP COLUMN "orderId",
ADD COLUMN     "billId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CatererCustomer" (
    "id" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatererCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatererBill" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "type" "BillType" NOT NULL,
    "number" INTEGER NOT NULL,
    "subtotalPaise" INTEGER NOT NULL DEFAULT 0,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "receivedPaise" INTEGER NOT NULL DEFAULT 0,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatererBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatererCustomer_shareToken_key" ON "CatererCustomer"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "CatererCustomer_catererId_phone_key" ON "CatererCustomer"("catererId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "CatererBill_shareToken_key" ON "CatererBill"("shareToken");

-- CreateIndex
CREATE INDEX "CatererBill_catererId_idx" ON "CatererBill"("catererId");

-- CreateIndex
CREATE UNIQUE INDEX "CatererBill_catererId_number_key" ON "CatererBill"("catererId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CatererBill_orderId_type_key" ON "CatererBill"("orderId", "type");

-- CreateIndex
CREATE INDEX "CatererOrder_customerId_idx" ON "CatererOrder"("customerId");

-- AddForeignKey
ALTER TABLE "CatererCustomer" ADD CONSTRAINT "CatererCustomer_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererOrder" ADD CONSTRAINT "CatererOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CatererCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererBill" ADD CONSTRAINT "CatererBill_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CatererOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererBill" ADD CONSTRAINT "CatererBill_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererOrderLine" ADD CONSTRAINT "CatererOrderLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "CatererBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererPayment" ADD CONSTRAINT "CatererPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "CatererBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

