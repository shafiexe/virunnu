-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'ADVANCE_PAID';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "advancePaise" INTEGER;
