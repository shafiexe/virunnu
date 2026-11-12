-- CreateTable
CREATE TABLE "CatererPurchase" (
    "id" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supplier" TEXT NOT NULL,
    "billNo" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Raw material',
    "totalPaise" INTEGER NOT NULL,
    "paidPaise" INTEGER NOT NULL DEFAULT 0,
    "employeeId" TEXT,
    "orderId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatererPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatererPurchaseLine" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "quantity" DOUBLE PRECISION NOT NULL,
    "ratePaise" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatererPurchaseLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatererPurchase_catererId_date_idx" ON "CatererPurchase"("catererId", "date");

-- CreateIndex
CREATE INDEX "CatererPurchase_orderId_idx" ON "CatererPurchase"("orderId");

-- AddForeignKey
ALTER TABLE "CatererPurchase" ADD CONSTRAINT "CatererPurchase_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererPurchase" ADD CONSTRAINT "CatererPurchase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererPurchase" ADD CONSTRAINT "CatererPurchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CatererOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererPurchaseLine" ADD CONSTRAINT "CatererPurchaseLine_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "CatererPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

