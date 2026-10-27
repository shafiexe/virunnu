-- AlterTable Hall: add minimumAdvancePaise and requireFullPayment
ALTER TABLE "Hall" ADD COLUMN "minimumAdvancePaise" INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE "Hall" ADD COLUMN "requireFullPayment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Booking: add guest fields, razorpay fields, make userId optional
ALTER TABLE "Booking" ADD COLUMN "guestName" TEXT;
ALTER TABLE "Booking" ADD COLUMN "guestPhone" TEXT;
ALTER TABLE "Booking" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "Booking" ADD COLUMN "guestAddress" TEXT;
ALTER TABLE "Booking" ADD COLUMN "razorpayOrderId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "razorpayPaymentId" TEXT;
ALTER TABLE "Booking" ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_razorpayOrderId_key" ON "Booking"("razorpayOrderId");
CREATE UNIQUE INDEX "Booking_razorpayPaymentId_key" ON "Booking"("razorpayPaymentId");
