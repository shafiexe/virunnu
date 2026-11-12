import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { GSTIN_PATTERN } from "@/lib/caterer-gst";

const schema = z.object({
  nextInvoiceNumber: z.number().int().min(1).max(100000000).optional(),
  upiId: z.string().trim().max(80).optional(),
  bankDetails: z.string().trim().max(400).optional(),
  invoiceNote: z.string().trim().max(400).optional(),
  gstEnabled: z.boolean().optional(),
  gstin: z.string().trim().toUpperCase().max(15).optional(),
  foodGstPercent: z.number().min(0).max(40).optional(),
  serviceGstPercent: z.number().min(0).max(40).optional(),
  gstInclusive: z.boolean().optional(),
}).refine((v) => !v.gstin || GSTIN_PATTERN.test(v.gstin), { message: "That GSTIN does not look right (15 characters, like 32ABCDE1234F1Z5)", path: ["gstin"] });

async function lastUsed(catererId: string) {
  const top = await db.catererBill.aggregate({ where: { catererId }, _max: { number: true } });
  return top._max.number ?? 0;
}

export async function GET() {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const c = ctx.caterer;
  return NextResponse.json({ nextInvoiceNumber: c.nextInvoiceNumber, lastUsed: await lastUsed(c.id), upiId: c.upiId, bankDetails: c.bankDetails, invoiceNote: c.invoiceNote, gstEnabled: c.gstEnabled, gstin: c.gstin, foodGstPercent: c.foodGstBp / 100, serviceGstPercent: c.serviceGstBp / 100, gstInclusive: c.gstInclusive });
}

export async function PATCH(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;

  // Numbers already on an invoice can't be reused, so the next number must be above the highest one issued
  const used = await lastUsed(ctx.caterer.id);
  if (d.nextInvoiceNumber !== undefined && d.nextInvoiceNumber <= used) {
    return NextResponse.json({ error: `Invoice ${used} is already issued, so the next number must be ${used + 1} or higher` }, { status: 400 });
  }
  // only what was sent is changed; an empty text clears that field
  const updated = await db.caterer.update({
    where: { id: ctx.caterer.id },
    data: {
      ...(d.nextInvoiceNumber !== undefined && { nextInvoiceNumber: d.nextInvoiceNumber }),
      ...(d.upiId !== undefined && { upiId: d.upiId || null }),
      ...(d.bankDetails !== undefined && { bankDetails: d.bankDetails || null }),
      ...(d.invoiceNote !== undefined && { invoiceNote: d.invoiceNote || null }),
      ...(d.gstEnabled !== undefined && { gstEnabled: d.gstEnabled }),
      ...(d.gstin !== undefined && { gstin: d.gstin || null }),
      ...(d.foodGstPercent !== undefined && { foodGstBp: Math.round(d.foodGstPercent * 100) }),
      ...(d.serviceGstPercent !== undefined && { serviceGstBp: Math.round(d.serviceGstPercent * 100) }),
      ...(d.gstInclusive !== undefined && { gstInclusive: d.gstInclusive }),
    },
  });
  return NextResponse.json({ nextInvoiceNumber: updated.nextInvoiceNumber });
}
