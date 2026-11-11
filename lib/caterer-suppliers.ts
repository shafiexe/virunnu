import { z } from "zod";

export const SUPPLIER_CATEGORIES = [
  "Vegetables", "Meat", "Fish", "Chicken", "Groceries", "Stationery & packing", "Gas & fuel", "Decoration", "Transport", "Other",
] as const;

export type SupplierCycleKey = "PER_BILL" | "WEEKLY" | "MONTHLY";
export const CYCLES: SupplierCycleKey[] = ["PER_BILL", "WEEKLY", "MONTHLY"];
export const CYCLE_LABEL: Record<SupplierCycleKey, string> = { PER_BILL: "Pay each bill", WEEKLY: "Paid weekly", MONTHLY: "Paid monthly" };
// how long a bill can wait before the supplier is "overdue"
export const CYCLE_DAYS: Record<SupplierCycleKey, number> = { PER_BILL: 0, WEEKLY: 7, MONTHLY: 30 };

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Enter the supplier's name").max(100),
  phone: z.string().trim().max(20).optional().transform((v) => v || undefined),
  category: z.string().trim().min(1).max(60).default("Other"),
  cycle: z.enum(["PER_BILL", "WEEKLY", "MONTHLY"]).default("PER_BILL"),
  notes: z.string().trim().max(300).optional().transform((v) => v || undefined),
});

export const settleSchema = z.object({
  amount: z.number().positive("Enter the amount paid").max(100000000),
  method: z.enum(["CASH", "UPI", "CARD", "BANK"]).default("CASH"),
  note: z.string().trim().max(120).optional().transform((v) => v || undefined),
  paidOn: z.string().date().optional(),
});
