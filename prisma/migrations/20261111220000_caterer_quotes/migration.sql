-- AlterTable
ALTER TABLE "Caterer" ADD COLUMN     "nextQuoteNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "CatererQuote" (
    "id" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "validUntil" DATE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "data" JSONB NOT NULL,
    "gst" JSONB NOT NULL,
    "totalPaise" INTEGER NOT NULL DEFAULT 0,
    "shareToken" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatererQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatererQuote_shareToken_key" ON "CatererQuote"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "CatererQuote_orderId_key" ON "CatererQuote"("orderId");

-- CreateIndex
CREATE INDEX "CatererQuote_catererId_createdAt_idx" ON "CatererQuote"("catererId", "createdAt");

-- CreateIndex
CREATE INDEX "CatererQuote_customerId_idx" ON "CatererQuote"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CatererQuote_catererId_number_key" ON "CatererQuote"("catererId", "number");

-- AddForeignKey
ALTER TABLE "CatererQuote" ADD CONSTRAINT "CatererQuote_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererQuote" ADD CONSTRAINT "CatererQuote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CatererCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

