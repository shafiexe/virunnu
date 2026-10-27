import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { bookingId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason: string | undefined = typeof body.reason === "string" ? body.reason : undefined;

  const booking = await db.booking.findFirst({
    where: { id: bookingId, orgId: session.orgId! },
    include: { hallSlot: true },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status !== "PENDING") return NextResponse.json({ error: "Booking is not pending" }, { status: 400 });

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED", cancelReason: reason ?? "Rejected by owner" },
    }),
    db.hallSlot.update({
      where: { id: booking.hallSlotId },
      data: { status: "AVAILABLE", heldUntil: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
