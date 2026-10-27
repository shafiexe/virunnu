-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('CONVENTION', 'CATERING');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CATERER';

-- AlterTable
ALTER TABLE "Caterer" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "type" "OrgType" NOT NULL DEFAULT 'CONVENTION';

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceRupees" INTEGER NOT NULL,
    "category" TEXT,
    "catererId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Caterer" ADD CONSTRAINT "Caterer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
