-- What Razorpay charged (fee including GST) on an online payment. Empty until Razorpay has reported it; the payout page fills it in.
ALTER TABLE "BookingPayment" ADD COLUMN "gatewayFeePaise" INTEGER;
