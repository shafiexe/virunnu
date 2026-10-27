-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "refundNote" TEXT,
ADD COLUMN     "refundPaise" INTEGER NOT NULL DEFAULT 0;
