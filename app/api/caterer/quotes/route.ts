import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { quoteSchema, quoteState, saveQuote } from "@/lib/caterer-quotes";
import { actorOf, logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(sp.get("pageSize") ?? "25") || 25));
  const where = { catererId: ctx.caterer.id };
  const [total, rows] = await Promise.all([
    db.catererQuote.count({ where }),
    db.catererQuote.findMany({ where, include: { customer: { select: { id: true, name: true, phone: true } } }, orderBy: [{ createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  return NextResponse.json({ data: rows.map((q) => ({ ...q, state: quoteState(q) })), total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const result = await saveQuote(ctx.caterer, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await logActivity(ctx.session, `Created quotation for ${parsed.data.customerName}`);
  return NextResponse.json({ quote: result.quote }, { status: 201 });
}
