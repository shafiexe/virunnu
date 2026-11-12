-- Requests the owner turned down used to be stored as cancelled with this reason. Move them to the new status so they
-- show in Enquiries and no longer in Bookings or Customers. Only unpaid ones, which is what a rejected request always is.
UPDATE "Booking" b SET "status" = 'REJECTED'
WHERE b."status" = 'CANCELLED' AND b."cancelReason" = 'Rejected by owner'
  AND NOT EXISTS (SELECT 1 FROM "BookingPayment" p WHERE p."bookingId" = b.id);
