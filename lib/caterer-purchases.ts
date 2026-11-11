import { z } from "zod";
import { lineAmountPaise } from "@/lib/caterer-orders";
import { SUPPLIER_CATEGORIES } from "@/lib/caterer-suppliers";

export const PURCHASE_CATEGORIES = SUPPLIER_CATEGORIES;

export const purchaseSchema = z
  .object({
    date: z.string().date("Pick the date"),
    supplier: z.string().trim().min(1, "Choose the supplier").max(100),
    supplierId: z.string().optional().transform((v) => v || undefined),
    billNo: z.string().trim().max(40).optional().transform((v) => v || undefined),
    category: z.string().trim().min(1).max(60).default("Groceries"),
    lines: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(100),
          unit: z.string().trim().min(1).max(20).default("kg"),
          quantity: z.number().positive("Quantity must be more than 0").max(1000000),
          rate: z.number().min(0).max(10000000),
        })
      )
      .max(80)
      .default([]),
    // used when no item lines are entered ("₹4,500 at the market")
    total: z.number().min(0).max(100000000).optional(),
    // amount paid at the time of purchase (create only); later payments are added one by one
    paid: z.number().min(0).max(100000000).default(0),
    method: z.enum(["CASH", "UPI", "CARD", "BANK"]).default("CASH"),
    employeeId: z.string().optional().transform((v) => v || undefined),
    orderId: z.string().optional().transform((v) => v || undefined),
    notes: z.string().trim().max(500).optional().transform((v) => v || undefined),
  })
  .refine((d) => d.lines.length > 0 || (d.total ?? 0) > 0, { message: "Add the items, or enter the total amount" });

export type PurchaseInput = z.infer<typeof purchaseSchema>;

export function purchaseTotals(d: PurchaseInput) {
  const lines = d.lines.map((l, i) => {
    const ratePaise = Math.round(l.rate * 100);
    return { name: l.name, unit: l.unit, quantity: l.quantity, ratePaise, amountPaise: lineAmountPaise(l.quantity, ratePaise), sortOrder: i };
  });
  const totalPaise = lines.length ? lines.reduce((s, l) => s + l.amountPaise, 0) : Math.round((d.total ?? 0) * 100);
  const paidPaise = Math.round(d.paid * 100);
  return { lines, totalPaise, paidPaise };
}
