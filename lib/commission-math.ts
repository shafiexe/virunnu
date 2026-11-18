// The money rules for online payments, with nothing else attached so they can be tested on their own.
// Virunnu keeps 1% of every payment a customer makes on the website (the whole amount paid, GST included).
// Razorpay's own fee on that payment is paid by the venue, out of its share. Money the venue records itself (cash, UPI to its own account) is never touched.
export const COMMISSION_BPS = 100;
export const commissionOf = (amountPaise: number) => Math.round((amountPaise * COMMISSION_BPS) / 10_000);

// Razorpay's payment record carries `fee` (what it charged, GST included) in paise once it has worked it out; until then it is missing.
export function feeOf(payment: { fee?: unknown } | null | undefined): number | null {
  const f = payment?.fee;
  return typeof f === "number" && Number.isInteger(f) && f >= 0 ? f : null;
}

export type PayoutBalance = { onlinePaise: number; commissionPaise: number; gatewayFeePaise: number; unknownFees: number; paidOutPaise: number; owedPaise: number };
// What Virunnu holds for a venue: online payments, less commission, less Razorpay's fee, less what has already been sent.
export const owedOf = (b: Pick<PayoutBalance, "onlinePaise" | "commissionPaise" | "gatewayFeePaise" | "paidOutPaise">) => b.onlinePaise - b.commissionPaise - b.gatewayFeePaise - b.paidOutPaise;
