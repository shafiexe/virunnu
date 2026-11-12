-- A hall booking can name the caterer the venue linked to it, and the enquiry sent to that caterer
ALTER TABLE "Booking" ADD COLUMN "catererId" TEXT, ADD COLUMN "catererEnquiryId" TEXT;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_catererId_fkey" FOREIGN KEY ("catererId") REFERENCES "Caterer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Each caterer payment gets the customer's receipt link. Existing payments get a random token; the column also keeps a
-- database default so code that does not name it (older deploys) can still insert.
ALTER TABLE "CatererPayment" ADD COLUMN "shareToken" TEXT;
UPDATE "CatererPayment" SET "shareToken" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') WHERE "shareToken" IS NULL;
ALTER TABLE "CatererPayment" ALTER COLUMN "shareToken" SET NOT NULL;
ALTER TABLE "CatererPayment" ALTER COLUMN "shareToken" SET DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
CREATE UNIQUE INDEX "CatererPayment_shareToken_key" ON "CatererPayment"("shareToken");
