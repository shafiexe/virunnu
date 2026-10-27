import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBooking } from "@/services/booking.service";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;
  const booking = await getBooking(bookingId);
  if (!booking || booking.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (booking.status !== "ADVANCE_PAID") {
    return NextResponse.json({ error: "No advance payment found" }, { status: 409 });
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.CONFIRMED },
  });

  return NextResponse.json({ ok: true });
}
