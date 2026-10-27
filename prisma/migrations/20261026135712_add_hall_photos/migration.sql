-- AlterTable
ALTER TABLE "Hall" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "HallPhoto" (
    "id" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HallPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HallPhoto" ADD CONSTRAINT "HallPhoto_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
