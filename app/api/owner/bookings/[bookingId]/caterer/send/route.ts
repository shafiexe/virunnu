import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { bookingRef } from "@/lib/booking-ledger";
import { isTestEmail } from "@/lib/test-address";
import { sendRawWhatsApp } from "@/services/notification.service";

const day = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Sends the linked caterer an enquiry for this booking: it lands in their Enquiries, where one tap turns it into an order.
// This shares the customer's name and phone with the caterer, so it only happens when the owner presses the button.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // a person who may not see phone numbers should not be able to pass them on either
  if (session.deny?.includes("hide.phones")) return NextResponse.json({ error: "Phone numbers are hidden for you, so you cannot share them" }, { status: 403 });

  const { bookingId } = await params;
  const booking = await db.booking.findFirst({
    where: { id: bookingId, orgId: session.orgId },
    include: { user: { select: { name: true, phone: true } }, caterer: true, hallSlot: { include: { template: true, hall: { include: { venue: { select: { name: true } } } } } } },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["CANCELLED", "EXPIRED", "REJECTED"].includes(booking.status)) return NextResponse.json({ error: "This booking is closed" }, { status: 409 });
  if (!booking.caterer || !booking.caterer.approved || booking.caterer.disabled) return NextResponse.json({ error: "Link a caterer first" }, { status: 409 });
  if (booking.catererEnquiryId) return NextResponse.json({ error: "Already sent to this caterer" }, { status: 409 });

  const name = booking.user?.name ?? booking.guestName ?? "Customer";
  const rawPhone = (booking.user?.phone ?? booking.guestPhone ?? "").replace(/\D/g, "");
  if (rawPhone.length < 10) return NextResponse.json({ error: "This booking has no phone number to share" }, { status: 409 });
  const phone = `+91${rawPhone.slice(-10)}`;
  const slot = booking.hallSlot;
  const message = `Hall booking at ${slot.hall.venue.name}, ${slot.hall.name} on ${day(slot.date)} (${slot.template.name}). Booking ${bookingRef(bookingId)}. The venue linked you for the catering and shared the customer's contact so you can quote.`;

  const enquiry = await db.cateringEnquiry.create({ data: { catererId: booking.caterer.id, name, phone, eventDate: slot.date, message } });
  await db.booking.update({ where: { id: bookingId }, data: { catererEnquiryId: enquiry.id } });

  // tests use example.com caterers, who must never be messaged
  const to = booking.caterer.whatsappNumber || booking.caterer.phone;
  if (to && !isTestEmail(booking.caterer.email)) {
    sendRawWhatsApp(to, `🔔 *New enquiry — ${booking.caterer.name}*\n\n👤 *${name}*\n📞 ${phone}\n📅 ${day(slot.date)}\n🏛️ ${slot.hall.venue.name}\n\n${message}\n\nOpen Enquiries in your Virunnu dashboard to make an order.`).catch(() => {});
  }
  await logActivity(session, `Sent booking ${bookingRef(bookingId).slice(-6)} to the caterer ${booking.caterer.name}`);
  return NextResponse.json({ ok: true }, { status: 201 });
}
