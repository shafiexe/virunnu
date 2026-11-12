-- The share token also gets a database default, so any code that inserts a payment without naming it still works
ALTER TABLE "BookingPayment" ALTER COLUMN "shareToken" SET DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
