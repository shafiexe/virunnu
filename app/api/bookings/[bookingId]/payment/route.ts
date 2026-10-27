import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/services/payment.service";
import { getBooking } from "@/services/booking.service";
import { getSession } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await params;
  const booking = await getBooking(bookingId);

  if (!booking || booking.userId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const order = await createOrder(bookingId);
  return NextResponse.json(order, { status: 201 });
}
