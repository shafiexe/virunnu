import { NextRequest, NextResponse } from "next/server";
import { getBooking } from "@/services/booking.service";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const booking = await getBooking(bookingId);

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = session.role === "OWNER" && booking.orgId === session.orgId;
  const isCustomer = booking.userId === session.userId;

  if (!isOwner && !isCustomer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ booking });
}
