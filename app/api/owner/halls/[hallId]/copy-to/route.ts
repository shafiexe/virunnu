import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

// Copies this hall's slot times, price and payment rules onto another hall of the same centre, so a second hall isn't set up from scratch.
// Slot times the other hall already has are left alone. Name, capacity, photos and amenities are not touched.
export async function POST(req: NextRequest, { params }: { params: Promise<{ hallId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ toHallId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose the hall to copy to" }, { status: 400 });
  const { hallId } = await params;
  if (hallId === parsed.data.toHallId) return NextResponse.json({ error: "Choose a different hall" }, { status: 400 });

  const [from, to] = await Promise.all([
    db.hall.findFirst({ where: { id: hallId, venue: { orgId: session.orgId } }, include: { slotTemplates: true } }),
    db.hall.findFirst({ where: { id: parsed.data.toHallId, venue: { orgId: session.orgId } }, include: { slotTemplates: true } }),
  ]);
  if (!from || !to) return NextResponse.json({ error: "Hall not found" }, { status: 404 });

  const has = new Set(to.slotTemplates.map((t) => `${t.startTime}-${t.endTime}`));
  const fresh = from.slotTemplates.filter((t) => !has.has(`${t.startTime}-${t.endTime}`));

  await db.$transaction(async (tx) => {
    await tx.hall.update({ where: { id: to.id }, data: { pricePerSlot: from.pricePerSlot, minimumAdvancePaise: from.minimumAdvancePaise, requireFullPayment: from.requireFullPayment } });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const t of fresh) {
      const tpl = await tx.slotTemplate.create({ data: { name: t.name, startTime: t.startTime, endTime: t.endTime, hallId: to.id } });
      // bookable for the next 60 days, like a slot added by hand
      await tx.hallSlot.createMany({
        data: Array.from({ length: 60 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() + i); return { hallId: to.id, templateId: tpl.id, date: d, status: "AVAILABLE" as const }; }),
        skipDuplicates: true,
      });
    }
  });
  await logActivity(session, `Copied ${from.name}'s slots and price to ${to.name}`);
  return NextResponse.json({ copied: fresh.length, skipped: from.slotTemplates.length - fresh.length });
}
