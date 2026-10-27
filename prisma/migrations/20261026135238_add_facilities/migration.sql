-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amountPaise" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "icon" TEXT NOT NULL DEFAULT '⚡',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
