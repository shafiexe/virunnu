import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { todayIST } from "@/lib/caterer-finance";

type Params = { params: Promise<{ purchaseId: string }> };
const schema = z.object({
  amount: z.number().positive("Enter the amount paid").max(100000000),
  method: z.enum(["CASH", "UPI", "CARD", "BANK"]).default("CASH"),
  note: z.string().trim().max(120).optional().transform((v) => v || undefined),
  paidOn: z.string().date().optional(),
});

// Pay all or part of what is owed to the supplier on this purchase.
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { purchaseId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const result = await db.$transaction(async (tx) => {
    const p = await tx.catererPurchase.findFirst({ where: { id: purchaseId, catererId: ctx.caterer.id } });
    if (!p) return { status: 404 as const, error: "Not found" };
    const amountPaise = Math.round(parsed.data.amount * 100);
    const due = p.totalPaise - p.paidPaise;
    if (amountPaise > due) return { status: 400 as const, error: `That is more than the ₹${(due / 100).toLocaleString("en-IN")} still due` };
    await tx.catererPurchasePayment.create({ data: { purchaseId, amountPaise, method: parsed.data.method, note: parsed.data.note, paidOn: parsed.data.paidOn ? new Date(parsed.data.paidOn) : todayIST() } });
    const updated = await tx.catererPurchase.update({ where: { id: purchaseId }, data: { paidPaise: { increment: amountPaise } } });
    return { status: 200 as const, purchase: updated };
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ purchase: result.purchase });
}
