import { z } from "zod";
import { ITEM_GROUPS, type ItemGroupKey } from "@/lib/caterer-items";

export const SERVE_PRESETS = [
  { label: "Breakfast", time: "08:00" },
  { label: "Lunch", time: "13:00" },
  { label: "Snacks & tea", time: "16:00" },
  { label: "Dinner", time: "20:00" },
] as const;

export type BillTypeKey = "FOOD" | "SERVICE";
export const BILL_TYPES: BillTypeKey[] = ["FOOD", "SERVICE"];
export const BILL_LABEL: Record<BillTypeKey, string> = { FOOD: "Food bill", SERVICE: "Service & Settings bill" };

// Food goes on the food bill; equipment, staff, decoration and everything else go on the service & settings bill.
export const billTypeOfGroup = (group: ItemGroupKey): BillTypeKey => (group === "FOOD" ? "FOOD" : "SERVICE");

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time");

const billAdjust = z
  .object({
    discount: z.number().min(0).max(100000000).optional(),
    discountReason: z.string().trim().max(120).optional().transform((v) => v || undefined),
    advance: z.number().min(0).max(100000000).optional(),
  })
  .optional();

export const orderSchema = z.object({
  date: z.string().date("Pick the date"),
  customerName: z.string().trim().min(1, "Customer name is required").max(100),
  customerPhone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  customerAddress: z.string().trim().max(300).optional().transform((v) => v || undefined),
  place: z.string().trim().max(200).optional().transform((v) => v || undefined),
  eventType: z.string().trim().max(60).optional().transform((v) => v || undefined),
  notes: z.string().trim().max(1000).optional().transform((v) => v || undefined),
  servings: z
    .array(z.object({ label: z.string().trim().min(1).max(40), time, guests: z.number().int().min(1).max(1000000).optional() }))
    .max(8)
    .default([]),
  lines: z
    .array(
      z.object({
        itemId: z.string().optional(),
        name: z.string().trim().min(1).max(100),
        group: z.enum(ITEM_GROUPS).default("FOOD"),
        unit: z.string().trim().min(1).max(20).default("nos"),
        quantity: z.number().positive("Quantity must be more than 0").max(1000000),
        rate: z.number().min(0).max(10000000),
        servingIndex: z.number().int().min(0).max(7).optional(),
      })
    )
    .max(150)
    .default([]),
  // who worked the function and what each is paid for it
  team: z.array(z.object({ employeeId: z.string().min(1), amount: z.number().min(0).max(10000000).default(0) })).max(40).optional(),
  foodBill: billAdjust,
  serviceBill: billAdjust,
  advanceMethod: z.enum(["CASH", "UPI", "CARD", "BANK"]).optional(),
  // the enquiry this order came from; it is marked attended once the order is saved
  enquiryId: z.string().optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;

export const lineAmountPaise = (quantity: number, ratePaise: number) => Math.round(quantity * ratePaise);

// Stored phone numbers look like +919876543210 so the same person is never filed twice.
export function normalizeCustomerPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  return `+91${d.length > 10 ? d.slice(-10) : d}`;
}

export type BillMoneyInput = { subtotalPaise: number; discountPaise: number; receivedPaise: number; taxPaise: number };

export function billMoney(b: BillMoneyInput) {
  const netPaise = Math.max(0, b.subtotalPaise - b.discountPaise + b.taxPaise);
  const balancePaise = Math.max(0, netPaise - b.receivedPaise);
  const state: "PAID" | "PARTLY" | "UNPAID" = netPaise > 0 && balancePaise === 0 ? "PAID" : b.receivedPaise > 0 ? "PARTLY" : "UNPAID";
  return { netPaise, balancePaise, state };
}

export const STATE_LABEL = { PAID: "Closed", PARTLY: "Part paid", UNPAID: "Unpaid" } as const;

export const formatTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
};

export const rs = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const formatInvoiceDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const below100 = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`);
const below1000 = (n: number) => (n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " and " + below100(n % 100) : ""}` : below100(n));

// Indian grouping: 1,73,510 → "One Lakh Seventy Three Thousand Five Hundred and Ten Rupees only"
export function amountInWords(paise: number) {
  let n = Math.round(paise / 100);
  if (n === 0) return "Zero Rupees only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${below100(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (n) parts.push(below1000(n));
  return `${parts.join(" ")} Rupees only`;
}
