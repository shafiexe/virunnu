-- Platform commission kept from each online (Razorpay) payment, and the payouts made to venue owners.
ALTER TABLE "BookingPayment" ADD COLUMN "commissionPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "payoutDetails" TEXT;

CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "paidOn" DATE NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payout_orgId_paidOn_idx" ON "Payout"("orgId", "paidOn");

ALTER TABLE "Payout" ADD CONSTRAINT "Payout_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Online payments made before this change carried no commission; it stays 0 for them.

-- The customer sign-in was removed; its code table is no longer used.
DROP TABLE IF EXISTS "OtpCode";
