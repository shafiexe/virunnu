import crypto from "crypto";

// The rules for what may be paid online and how a payment is proved. No database or network here, so they are easy to test.

// Never accept a token payment, whatever the venue's own minimum says
export const MIN_ONLINE_PAYMENT_PAISE = 10_000;

const rs = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

export function checkOnlineAmount(o: { isFullPayment: boolean; amountPaise: number; totalPaise: number; minimumAdvancePaise: number; requireFullPayment: boolean }): string | null {
  if (o.isFullPayment) return o.amountPaise === o.totalPaise ? null : `The full payment is ${rs(o.totalPaise)}`;
  if (o.requireFullPayment) return "This hall needs the full payment online";
  const min = Math.max(o.minimumAdvancePaise, MIN_ONLINE_PAYMENT_PAISE);
  if (o.amountPaise < min) return `The advance must be at least ${rs(min)}`;
  if (o.amountPaise >= o.totalPaise) return `Use full payment for ${rs(o.totalPaise)}`;
  return null;
}

export function signatureMatches(secret: string, orderId: string, paymentId: string, signature: string) {
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

