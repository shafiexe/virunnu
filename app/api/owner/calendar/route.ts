import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  venueId: z.string().cuid(),
  year: z.coerce.number().int().min(2020).max(2099),
  month: z.coerce.number().int().min(1).max(12),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = schema.safeParse(sp);
  if (!parsed.success) {
    return NextResponse.json({ error: "venueId, year, month required" }, { status: 400 });
  }

  const { venueId, year, month } = parsed.data;

  const venue = await db.venue.findFirst({
    where: { id: venueId, orgId: session.orgId! },
    include: { halls: { include: { slotTemplates: true } } },
  });

  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  const from = new Date(`${year}-${String(month).padStart(2, "0")}-01`);
  const lastDay = new Date(year, month, 0).getDate();
  const to = new Date(`${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);

  const hallIds = venue.halls.map((h) => h.id);

  const [slots, blockedDates] = await Promise.all([
    db.hallSlot.findMany({
      where: { hall: { venueId }, date: { gte: from, lte: to } },
      include: {
        template: true,
        hall: { select: { id: true, name: true, pricePerSlot: true } },
        bookings: {
          where: { status: { notIn: ["CANCELLED", "EXPIRED"] } },
          select: {
            id: true,
            status: true,
            totalPaise: true,
            advancePaise: true,
            guestName: true,
            guestPhone: true,
            user: { select: { name: true, phone: true } },
          },
          take: 1,
        },
      },
      orderBy: [{ date: "asc" }, { hall: { name: "asc" } }, { template: { startTime: "asc" } }],
    }),
    db.blockedDate.findMany({
      where: { hallId: { in: hallIds }, date: { gte: from, lte: to } },
      select: { id: true, hallId: true, date: true, reason: true },
    }),
  ]);

  const serialized = slots.map((s) => ({
    ...s,
    date: s.date.toISOString().slice(0, 10),
  }));

  const blockedSerialized = blockedDates.map((b) => ({
    ...b,
    date: b.date.toISOString().slice(0, 10),
  }));

  return NextResponse.json({ venue, slots: serialized, blockedDates: blockedSerialized });
}
