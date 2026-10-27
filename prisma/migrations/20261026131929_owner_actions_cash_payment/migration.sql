-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'CASH');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'ONLINE';
