import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  hallId: z.string().min(1),
  from: z.string().date(),
  to: z.string().date(),
  reason: z.string().trim().max(200).optional(),
  // only these weekdays (0 = Sunday), for "every Monday for the repairs"; all days when left out
  weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
});

// Blocks a run of days at once. Days that already have a live booking are skipped and reported, never blocked over it.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose the first and last day" }, { status: 400 });
  const { hallId, from, to, reason, weekdays } = parsed.data;
  const start = new Date(from + "T00:00:00Z"), end = new Date(to + "T00:00:00Z");
  if (end < start) return NextResponse.json({ error: "The last day is before the first day" }, { status: 400 });
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (days > 366) return NextResponse.json({ error: "Block up to a year at a time" }, { status: 400 });

  const hall = await db.hall.findFirst({ where: { id: hallId, venue: { orgId: session.orgId } } });
  if (!hall) return NextResponse.json({ error: "Hall not found" }, { status: 404 });

  const wanted: Date[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    if (!weekdays?.length || weekdays.includes(d.getUTCDay())) wanted.push(d);
  }
  if (wanted.length === 0) return NextResponse.json({ error: "No days match" }, { status: 400 });

  // days with a booking in progress or confirmed stay open
  const booked = await db.hallSlot.findMany({ where: { hallId, date: { in: wanted }, status: { in: ["BOOKED", "HELD"] }, bookings: { some: { status: { in: ["PENDING", "APPROVED", "ADVANCE_PAID", "CONFIRMED"] } } } }, select: { date: true } }).catch(() => []);
  const busy = new Set(booked.map((b) => b.date.toISOString().slice(0, 10)));
  const toBlock = wanted.filter((d) => !busy.has(d.toISOString().slice(0, 10)));

  const r = await db.blockedDate.createMany({ data: toBlock.map((date) => ({ hallId, date, reason: reason ?? null })), skipDuplicates: true });
  await logActivity(session, `Blocked ${r.count} date${r.count === 1 ? "" : "s"} on ${hall.name}`);
  return NextResponse.json({ blocked: r.count, alreadyBlocked: toBlock.length - r.count, skippedBooked: [...busy].sort() }, { status: 201 });
}
