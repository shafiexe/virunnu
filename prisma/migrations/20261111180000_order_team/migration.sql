-- CreateTable
CREATE TABLE "CatererOrderStaff" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "CatererOrderStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatererOrderStaff_employeeId_idx" ON "CatererOrderStaff"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "CatererOrderStaff_orderId_employeeId_key" ON "CatererOrderStaff"("orderId", "employeeId");

-- AddForeignKey
ALTER TABLE "CatererOrderStaff" ADD CONSTRAINT "CatererOrderStaff_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CatererOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererOrderStaff" ADD CONSTRAINT "CatererOrderStaff_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

