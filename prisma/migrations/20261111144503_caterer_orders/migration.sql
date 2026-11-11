-- CreateEnum
CREATE TYPE "ItemGroup" AS ENUM ('FOOD', 'EQUIPMENT', 'STAFF', 'DECOR', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CONFIRMED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Caterer" ADD COLUMN     "nextOrderNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "CatererItem" (
    "id" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" "ItemGroup" NOT NULL DEFAULT 'FOOD',
    "unit" TEXT NOT NULL DEFAULT 'nos',
    "ratePaise" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatererItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatererOrder" (
    "id" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "place" TEXT,
    "eventType" TEXT,
    "notes" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "subtotalPaise" INTEGER NOT NULL DEFAULT 0,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "receivedPaise" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatererOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatererServing" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "guests" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatererServing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatererOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "servingId" TEXT,
    "itemId" TEXT,
    "name" TEXT NOT NULL,
    "group" "ItemGroup" NOT NULL DEFAULT 'FOOD',
    "unit" TEXT NOT NULL DEFAULT 'nos',
    "quantity" DOUBLE PRECISION NOT NULL,
    "ratePaise" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatererOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatererPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "paidOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatererPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatererItem_catererId_idx" ON "CatererItem"("catererId");

-- CreateIndex
CREATE UNIQUE INDEX "CatererItem_catererId_name_key" ON "CatererItem"("catererId", "name");

-- CreateIndex
CREATE INDEX "CatererOrder_catererId_date_idx" ON "CatererOrder"("catererId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CatererOrder_catererId_number_key" ON "CatererOrder"("catererId", "number");

-- AddForeignKey
ALTER TABLE "CatererItem" ADD CONSTRAINT "CatererItem_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererOrder" ADD CONSTRAINT "CatererOrder_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererServing" ADD CONSTRAINT "CatererServing_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CatererOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererOrderLine" ADD CONSTRAINT "CatererOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CatererOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererOrderLine" ADD CONSTRAINT "CatererOrderLine_servingId_fkey" FOREIGN KEY ("servingId") REFERENCES "CatererServing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererPayment" ADD CONSTRAINT "CatererPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CatererOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
