import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BookingStatus, SlotStatus } from "@prisma/client";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { asDay, todayISO } from "@/lib/booking-ledger";
import { actorOf, logActivity } from "@/lib/activity";
import { normalizeCustomerPhone } from "@/lib/caterer-orders";
import { rowProblem, type RowCheck } from "@/lib/diary";

const row = z.object({
  date: z.string().date(),
  templateId: z.string().cuid(),
  name: z.string().trim().max(100).optional(),
  phone: z.string().max(20).optional(),
  totalRupees: z.number().int().min(1).max(100_000_000),
  advanceRupees: z.number().int().min(0).max(100_000_000).optional(),
});
const schema = z.object({
  venueId: z.string().cuid(),
  hallId: z.string().cuid(),
  apply: z.boolean(),
  rows: z.array(row).min(1).max(200),
});

// Adds many bookings at once (from the paper diary). With apply=false it only checks every row and changes nothing. The
// same checks run again when applying, so a date taken in the meantime is skipped, not double-booked. Customers are never
// emailed or messaged: these are old records the venue is writing down, not new requests.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const { venueId, hallId, apply, rows } = parsed.data;

  const hall = await db.hall.findFirst({ where: { id: hallId, venueId, venue: { orgId: session.orgId } }, include: { slotTemplates: { select: { id: true } } } });
  if (!hall) return NextResponse.json({ error: "Hall not found" }, { status: 404 });
  const templateIds = new Set(hall.slotTemplates.map((t) => t.id));

  const dates = [...new Set(rows.map((r) => r.date))].map((d) => new Date(d));
  const [slots, blocked] = await Promise.all([
    db.hallSlot.findMany({ where: { hallId, date: { in: dates } }, select: { templateId: true, date: true, status: true } }),
    db.blockedDate.findMany({ where: { hallId, date: { in: dates } }, select: { date: true } }),
  ]);
  const taken = new Set(slots.filter((s) => s.status !== SlotStatus.AVAILABLE).map((s) => `${s.date.toISOString().slice(0, 10)}|${s.templateId}`));
  const blockedDays = new Set(blocked.map((b) => b.date.toISOString().slice(0, 10)));

  const seen = new Set<string>();
  const checks: RowCheck[] = rows.map((r) => {
    const key = `${r.date}|${r.templateId}`;
    if (!templateIds.has(r.templateId) || rowProblem({ date: r.date, templateId: r.templateId, name: r.name ?? null, phone: r.phone ?? null, totalRupees: r.totalRupees, advanceRupees: r.advanceRupees ?? null })) return "invalid";
    if (blockedDays.has(r.date)) return "blocked";
    if (taken.has(key)) return "booked";
    if (seen.has(key)) return "duplicate";
    seen.add(key);
    return "ok";
  });

  if (!apply) return NextResponse.json({ checks, added: 0 });

  const actor = await actorOf(session);
  const results: RowCheck[] = [...checks];
  let added = 0;
  for (let i = 0; i < rows.length; i++) {
    if (checks[i] !== "ok") continue;
    const r = rows[i];
    const phoneDigits = (r.phone ?? "").replace(/\D/g, "");
    try {
      await db.$transaction(async (tx) => {
        const dateObj = new Date(r.date);
        const existing = await tx.hallSlot.findUnique({ where: { hallId_templateId_date: { hallId, templateId: r.templateId, date: dateObj } } });
        if (existing && existing.status !== SlotStatus.AVAILABLE) throw new Error("TAKEN");
        const slotId = existing
          ? (await tx.hallSlot.update({ where: { id: existing.id }, data: { status: SlotStatus.BOOKED, heldUntil: null } })).id
          : (await tx.hallSlot.create({ data: { hallId, templateId: r.templateId, date: dateObj, status: SlotStatus.BOOKED } })).id;

        // with a phone the person becomes a customer like any other booking; without one, the booking keeps just the name
        let userId: string | null = null;
        if (phoneDigits.length >= 10) {
          const phone = normalizeCustomerPhone(phoneDigits);
          // the same person may already be saved with the number typed with or without +91
          const user = await tx.user.findFirst({ where: { phone: { in: [phone, phone.slice(3)] } } });
          userId = user ? user.id : (await tx.user.create({ data: { phone, name: r.name || null, role: "CUSTOMER" } })).id;
          if (user && r.name && !user.name) await tx.user.update({ where: { id: user.id }, data: { name: r.name } });
        }
        const totalPaise = r.totalRupees * 100;
        const advPaise = Math.min((r.advanceRupees ?? 0) * 100, totalPaise);
        await tx.booking.create({
          data: {
            hallSlotId: slotId, orgId: session.orgId!, userId,
            guestName: userId ? null : r.name || null,
            totalPaise,
            advancePaise: advPaise > 0 ? advPaise : null,
            status: advPaise > 0 && advPaise < totalPaise ? BookingStatus.ADVANCE_PAID : BookingStatus.CONFIRMED,
            paymentMethod: "CASH",
            ...(advPaise > 0 ? { payments: { create: { orgId: session.orgId!, amountPaise: advPaise, method: "CASH", paidOn: asDay(todayISO()), recordedBy: actor.label } } } : {}),
          },
        });
      });
      added++;
    } catch (e) {
      if (e instanceof Error && e.message === "TAKEN") results[i] = "booked";
      else throw e;
    }
  }
  if (added > 0) await logActivity(session, `Added ${added} booking${added === 1 ? "" : "s"} from the paper diary`);
  return NextResponse.json({ checks: results, added });
}
