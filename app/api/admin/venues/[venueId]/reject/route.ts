import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ venueId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { venueId } = await params;

  // Only reject venues that are still pending — never silently delete an approved venue
  const venue = await db.venue.findUnique({ where: { id: venueId }, select: { approved: true } });
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (venue.approved) return NextResponse.json({ error: "Cannot reject an already-approved venue" }, { status: 400 });

  // Collect hall IDs so we can delete child records that lack onDelete: Cascade
  const halls = await db.hall.findMany({ where: { venueId }, select: { id: true } });
  const hallIds = halls.map((h) => h.id);

  await db.$transaction(async (tx) => {
    // Bookings → HallSlots → SlotTemplates (no cascade); HallPhoto/BlockedDate do cascade
    if (hallIds.length > 0) {
      await tx.booking.deleteMany({ where: { hallSlot: { hallId: { in: hallIds } } } });
      await tx.hallSlot.deleteMany({ where: { hallId: { in: hallIds } } });
      await tx.slotTemplate.deleteMany({ where: { hallId: { in: hallIds } } });
      await tx.hall.deleteMany({ where: { venueId } });
    }
    await tx.venue.delete({ where: { id: venueId } });
  });

  return NextResponse.redirect(new URL("/admin", _req.url), 303);
}
