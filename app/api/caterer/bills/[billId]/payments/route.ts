import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { todayIST } from "@/lib/caterer-finance";
import { actorOf, logActivity } from "@/lib/activity";

type Params = { params: Promise<{ billId: string }> };

const schema = z.object({
  amount: z.number().positive("Enter the amount received").max(100000000),
  method: z.enum(["CASH", "UPI", "CARD", "BANK"]).default("CASH"),
  note: z.string().trim().max(120).optional().transform((v) => v || undefined),
  paidOn: z.string().date().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { billId } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const actor = await actorOf(ctx.session);
  const result = await db.$transaction(async (tx) => {
    const bill = await tx.catererBill.findFirst({ where: { id: billId, catererId: ctx.caterer.id } });
    if (!bill) return { status: 404 as const, error: "Not found" };
    const amountPaise = Math.round(parsed.data.amount * 100);
    const balance = bill.subtotalPaise - bill.discountPaise + bill.taxPaise - bill.receivedPaise;
    if (amountPaise > balance) return { status: 400 as const, error: `That is more than the balance of ₹${(balance / 100).toLocaleString("en-IN")}` };
    const payment = await tx.catererPayment.create({
      data: { billId, amountPaise, method: parsed.data.method, note: parsed.data.note, paidOn: parsed.data.paidOn ? new Date(parsed.data.paidOn) : todayIST(), recordedBy: actor.label },
    });
    await tx.catererBill.update({ where: { id: billId }, data: { receivedPaise: { increment: amountPaise } } });
    return { status: 201 as const, payment };
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  await logActivity(ctx.session, `Recorded a payment of ₹${(result.payment.amountPaise / 100).toLocaleString("en-IN")} from a customer`);
  return NextResponse.json({ payment: result.payment }, { status: 201 });
}
