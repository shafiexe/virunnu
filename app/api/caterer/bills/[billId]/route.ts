import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { computeGst } from "@/lib/caterer-gst";

type Params = { params: Promise<{ billId: string }> };

const schema = z.object({
  discount: z.number().min(0).max(100000000),
  discountReason: z.string().trim().max(120).optional().transform((v) => v || undefined),
});

// Change the discount on one bill without touching its items.
export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { billId } = await params;
  const bill = await db.catererBill.findFirst({ where: { id: billId, catererId: ctx.caterer.id } });
  if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const discountPaise = Math.round(parsed.data.discount * 100);
  if (discountPaise > bill.subtotalPaise) return NextResponse.json({ error: "Discount can't be more than the bill total" }, { status: 400 });
  const after = computeGst(bill.subtotalPaise, discountPaise, bill);
  if (bill.subtotalPaise - discountPaise + after.taxPaise < bill.receivedPaise) {
    return NextResponse.json({ error: "That discount would leave the bill smaller than what you've already received. Undo a payment first." }, { status: 400 });
  }
  const updated = await db.catererBill.update({ where: { id: billId }, data: { discountPaise, discountReason: parsed.data.discountReason ?? null, gstPaise: after.gstPaise, taxPaise: after.taxPaise } });
  return NextResponse.json({ bill: updated });
}
