import { z } from "zod";

// How a customer paid. ONLINE is only ever written by the website's own payment flow.
export const PAY_METHODS = ["CASH", "UPI", "BANK", "CARD", "CHEQUE"] as const;
export const METHOD_LABEL: Record<string, string> = { CASH: "Cash", UPI: "UPI", BANK: "Bank transfer", CARD: "Card", CHEQUE: "Cheque", ONLINE: "Online" };

export const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const asDay = (iso: string) => new Date(iso + "T00:00:00Z");

export const paymentBody = z.object({
  amountRupees: z.number().positive("Enter the amount").max(100000000),
  method: z.enum(PAY_METHODS).default("CASH"),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(200).optional(),
});

type Money = { totalPaise: number; discountPaise?: number | null };
export const netOf = (b: Money) => b.totalPaise - (b.discountPaise ?? 0);

// What the booking's status should be once `paid` has been received. Cancelled and expired ones never change here.
export function statusAfterPayment(current: string, net: number, paid: number) {
  if (current === "CANCELLED" || current === "EXPIRED") return current;
  if (paid >= net && net > 0) return "CONFIRMED";
  if (paid > 0) return "ADVANCE_PAID";
  return current;
}

// A short reference for a receipt: the booking's own reference and the payment's number in time order
export const bookingRef = (id: string) => id.slice(-10).toUpperCase();
export const receiptNo = (id: string, index: number) => `${bookingRef(id)}-${String(index + 1).padStart(2, "0")}`;
