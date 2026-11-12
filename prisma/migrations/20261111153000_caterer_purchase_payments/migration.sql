-- CreateTable
CREATE TABLE "CatererPurchasePayment" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "paidOn" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatererPurchasePayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CatererPurchasePayment" ADD CONSTRAINT "CatererPurchasePayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CatererPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

