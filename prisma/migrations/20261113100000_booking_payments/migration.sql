-- CreateTable
CREATE TABLE "BookingPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "paidOn" DATE NOT NULL,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingPayment_bookingId_idx" ON "BookingPayment"("bookingId");

-- CreateIndex
CREATE INDEX "BookingPayment_orgId_paidOn_idx" ON "BookingPayment"("orgId", "paidOn");

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Carry today's figures into the ledger so no total changes. Confirmed counted as fully paid, advance-paid and
-- cancelled bookings counted their advance. Runs once, on a table that is empty at this point.
INSERT INTO "BookingPayment" ("id", "bookingId", "orgId", "amountPaise", "method", "note", "paidOn", "createdAt")
SELECT gen_random_uuid()::text, x.id, x."orgId", x.paid,
       CASE WHEN x."paymentMethod" = 'ONLINE' THEN 'ONLINE' ELSE 'CASH' END,
       'Carried over from before payment records', x."createdAt"::date, x."createdAt"
FROM (
  SELECT b.id, b."orgId", b."paymentMethod", b."createdAt",
         CASE WHEN b.status = 'CONFIRMED' THEN b."totalPaise" - COALESCE(b."discountPaise", 0)
              WHEN b.status IN ('ADVANCE_PAID', 'CANCELLED') THEN COALESCE(b."advancePaise", 0)
              ELSE 0 END AS paid
  FROM "Booking" b
) x
WHERE x.paid > 0;

-- A confirmed booking now says how much was paid, like every other booking does
UPDATE "Booking" b
SET "advancePaise" = p.total
FROM (SELECT "bookingId", SUM("amountPaise") AS total FROM "BookingPayment" GROUP BY "bookingId") p
WHERE p."bookingId" = b.id AND b.status = 'CONFIRMED';
