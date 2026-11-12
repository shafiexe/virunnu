-- AlterTable: existing payments get a random token too, then it becomes required and unique
ALTER TABLE "BookingPayment" ADD COLUMN "shareToken" TEXT;
UPDATE "BookingPayment" SET "shareToken" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') WHERE "shareToken" IS NULL;
ALTER TABLE "BookingPayment" ALTER COLUMN "shareToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_shareToken_key" ON "BookingPayment"("shareToken");
