import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { bookingRef } from "@/lib/booking-ledger";

const body = z.object({ catererId: z.string().min(1).nullable() });

// Link a caterer to this booking, or take the link off. Changing the caterer starts over: nothing has been sent to the new one.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { bookingId } = await params;
  const booking = await db.booking.findFirst({ where: { id: bookingId, orgId: session.orgId }, select: { id: true, status: true, catererId: true } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["CANCELLED", "EXPIRED", "REJECTED"].includes(booking.status)) return NextResponse.json({ error: "This booking is closed" }, { status: 409 });

  const { catererId } = parsed.data;
  let name = "";
  if (catererId) {
    const caterer = await db.caterer.findFirst({ where: { id: catererId, approved: true, disabled: false }, select: { name: true } });
    if (!caterer) return NextResponse.json({ error: "That caterer is not available" }, { status: 404 });
    name = caterer.name;
  }
  if (catererId !== booking.catererId) {
    await db.booking.update({ where: { id: bookingId }, data: { catererId, catererEnquiryId: null } });
    await logActivity(session, catererId ? `Linked ${name} as the caterer on booking ${bookingRef(bookingId).slice(-6)}` : `Removed the caterer from booking ${bookingRef(bookingId).slice(-6)}`);
  }
  return NextResponse.json({ ok: true });
}
