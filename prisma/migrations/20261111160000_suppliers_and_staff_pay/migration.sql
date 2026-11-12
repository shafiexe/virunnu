-- CreateEnum
CREATE TYPE "SupplierCycle" AS ENUM ('PER_BILL', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "CatererPurchase" ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "dailyRatePaise" INTEGER,
ADD COLUMN     "payType" TEXT NOT NULL DEFAULT 'MONTHLY';

-- CreateTable
CREATE TABLE "CatererSupplier" (
    "id" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "cycle" "SupplierCycle" NOT NULL DEFAULT 'PER_BILL',
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatererSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatererStaffPayment" (
    "id" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SALARY',
    "forMonth" TEXT,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatererStaffPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatererAttendance" (
    "id" TEXT NOT NULL,
    "catererId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "units" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "CatererAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatererSupplier_catererId_name_key" ON "CatererSupplier"("catererId", "name");

-- CreateIndex
CREATE INDEX "CatererStaffPayment_catererId_date_idx" ON "CatererStaffPayment"("catererId", "date");

-- CreateIndex
CREATE INDEX "CatererStaffPayment_employeeId_date_idx" ON "CatererStaffPayment"("employeeId", "date");

-- CreateIndex
CREATE INDEX "CatererAttendance_catererId_date_idx" ON "CatererAttendance"("catererId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CatererAttendance_employeeId_date_key" ON "CatererAttendance"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "CatererPurchase" ADD CONSTRAINT "CatererPurchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "CatererSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererSupplier" ADD CONSTRAINT "CatererSupplier_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererStaffPayment" ADD CONSTRAINT "CatererStaffPayment_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererStaffPayment" ADD CONSTRAINT "CatererStaffPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererAttendance" ADD CONSTRAINT "CatererAttendance_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatererAttendance" ADD CONSTRAINT "CatererAttendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

