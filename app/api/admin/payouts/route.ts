import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { payoutBalances } from "@/lib/commission";

const schema = z.object({
  orgId: z.string().min(1),
  amountRupees: z.number().positive().max(10_000_000),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

// The admin records that money was sent to a venue. It cannot be more than what Virunnu holds for that venue.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const amountPaise = Math.round(d.amountRupees * 100);
  const org = await db.organization.findFirst({ where: { id: d.orgId, type: "CONVENTION" }, select: { id: true } });
  if (!org) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  const owed = (await payoutBalances([d.orgId])).get(d.orgId)?.owedPaise ?? 0;
  if (amountPaise > owed) return NextResponse.json({ error: `Only ₹${(owed / 100).toLocaleString("en-IN")} is owed to this venue` }, { status: 400 });
  const payout = await db.payout.create({ data: { orgId: d.orgId, amountPaise, paidOn: new Date(d.paidOn + "T00:00:00Z"), reference: d.reference || null, note: d.note || null } });
  return NextResponse.json({ payout }, { status: 201 });
}

// Where a venue's money is sent: a UPI id or bank details, as the owner gave them.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ orgId: z.string().min(1), payoutDetails: z.string().trim().max(500) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  await db.organization.updateMany({ where: { id: parsed.data.orgId, type: "CONVENTION" }, data: { payoutDetails: parsed.data.payoutDetails || null } });
  return NextResponse.json({ ok: true });
}
