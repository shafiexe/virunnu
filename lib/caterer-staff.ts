import { z } from "zod";

export type PayTypeKey = "MONTHLY" | "DAILY";
export const PAY_LABEL: Record<PayTypeKey, string> = { MONTHLY: "Monthly salary", DAILY: "Daily wage" };

export const PAY_KINDS = ["SALARY", "WAGE", "ADVANCE", "OTHER"] as const;
export type PayKind = (typeof PAY_KINDS)[number];
export const KIND_NAME: Record<PayKind, string> = { SALARY: "Salary", WAGE: "Daily wages", ADVANCE: "Advance", OTHER: "Bonus / other" };

export const staffSchema = z.object({
  name: z.string().trim().min(1, "Enter the person's name").max(100),
  phone: z.string().trim().max(20).optional().transform((v) => v || undefined),
  role: z.string().trim().min(1).max(80).default("Kitchen team"),
  payType: z.enum(["MONTHLY", "DAILY"]).default("MONTHLY"),
  // rupees a month for MONTHLY, rupees a day for DAILY. Someone who works only now and then is a daily-wage person.
  rate: z.number().min(0).max(10000000).default(0),
});

export const staffPaymentSchema = z.object({
  amount: z.number().positive("Enter the amount").max(100000000),
  kind: z.enum(PAY_KINDS).default("SALARY"),
  method: z.enum(["CASH", "UPI", "CARD", "BANK"]).default("CASH"),
  date: z.string().date().optional(),
  note: z.string().trim().max(120).optional().transform((v) => v || undefined),
});

export const attendanceSchema = z.object({
  date: z.string().date(),
  units: z.union([z.literal(0), z.literal(0.5), z.literal(1)]),
});

export const ROLES = ["Cook", "Helper", "Serving boy", "Captain", "Supervisor", "Driver", "Decorator", "Kitchen team"];
