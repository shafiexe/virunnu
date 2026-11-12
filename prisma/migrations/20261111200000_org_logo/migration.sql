-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "logoUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrgLogo" (
    "orgId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgLogo_pkey" PRIMARY KEY ("orgId")
);

-- AddForeignKey
ALTER TABLE "OrgLogo" ADD CONSTRAINT "OrgLogo_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

