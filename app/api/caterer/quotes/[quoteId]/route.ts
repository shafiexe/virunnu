import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { quoteSchema, saveQuote, type QuoteGst } from "@/lib/caterer-quotes";

type Params = { params: Promise<{ quoteId: string }> };

// Either a status change ({ status }) or the whole quotation again (the form's fields).
export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { quoteId } = await params;
  const q = await db.catererQuote.findFirst({ where: { id: quoteId, catererId: ctx.caterer.id } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);

  const status = z.object({ status: z.enum(["OPEN", "DECLINED"]) }).safeParse(body);
  if (status.success) {
    if (q.status === "ACCEPTED") return NextResponse.json({ error: "This quotation has already become an order" }, { status: 400 });
    const updated = await db.catererQuote.update({ where: { id: q.id }, data: { status: status.data.status } });
    return NextResponse.json({ quote: updated });
  }

  if (q.status === "ACCEPTED") return NextResponse.json({ error: "This quotation has already become an order, so it can't be changed" }, { status: 400 });
  const parsed = quoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const result = await saveQuote(ctx.caterer, parsed.data, { id: q.id, gst: q.gst as unknown as QuoteGst, number: q.number, createdAt: q.createdAt });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  // changing the quotation reopens it
  const quote = await db.catererQuote.update({ where: { id: q.id }, data: { status: "OPEN" } });
  return NextResponse.json({ quote });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { quoteId } = await params;
  const q = await db.catererQuote.findFirst({ where: { id: quoteId, catererId: ctx.caterer.id } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (q.status === "ACCEPTED") return NextResponse.json({ error: "This quotation became an order, so it is kept as a record" }, { status: 400 });
  await db.catererQuote.delete({ where: { id: q.id } });
  return NextResponse.json({ ok: true });
}
