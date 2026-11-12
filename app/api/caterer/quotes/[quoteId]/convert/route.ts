import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { createOrder } from "@/lib/caterer-order-create";
import { orderSchema } from "@/lib/caterer-orders";
import { parseQuoteData } from "@/lib/caterer-quotes";
import { actorOf, logActivity } from "@/lib/activity";

const body = z.object({ date: z.string().date().optional(), advance: z.number().min(0).optional(), advanceMethod: z.enum(["CASH", "UPI", "CARD", "BANK"]).optional() });

// The customer said yes: file the order (with its bills, priced with today's GST settings) and link it to the quotation.
export async function POST(req: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { quoteId } = await params;
  const q = await db.catererQuote.findFirst({ where: { id: quoteId, catererId: ctx.caterer.id } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (q.status === "ACCEPTED" || q.orderId) return NextResponse.json({ error: "This quotation is already an order", orderId: q.orderId }, { status: 409 });

  const opts = body.safeParse(await req.json().catch(() => ({})));
  if (!opts.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const data = parseQuoteData(q.data as never);
  const { validUntil: _v, ...rest } = data;
  void _v;
  const advance = opts.data.advance ?? 0;
  const order = orderSchema.safeParse({
    ...rest, date: opts.data.date ?? rest.date,
    // an advance goes on the food bill, or on the service bill when the quotation has no food
    ...(advance > 0 ? { [rest.lines.some((l) => l.group === "FOOD") ? "foodBill" : "serviceBill"]: { ...(rest.lines.some((l) => l.group === "FOOD") ? rest.foodBill : rest.serviceBill), advance }, advanceMethod: opts.data.advanceMethod } : {}),
  });
  if (!order.success) return NextResponse.json({ error: order.error.issues[0]?.message ?? "Invalid quotation" }, { status: 400 });

  const actor = await actorOf(ctx.session);
  const result = await createOrder(ctx.caterer, order.data, actor.label);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await logActivity(ctx.session, `Turned quotation into an order for ${data.customerName}`);
  await db.catererQuote.update({ where: { id: q.id }, data: { status: "ACCEPTED", orderId: result.order.id } });
  return NextResponse.json({ orderId: result.order.id }, { status: 201 });
}
