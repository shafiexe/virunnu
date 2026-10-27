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

  // Delete halls first (cascades to HallPhoto, SlotTemplate, HallSlot), then the venue
  await db.$transaction([
    db.hall.deleteMany({ where: { venueId } }),
    db.venue.delete({ where: { id: venueId } }),
  ]);

  return NextResponse.redirect(new URL("/admin", _req.url), 303);
}
