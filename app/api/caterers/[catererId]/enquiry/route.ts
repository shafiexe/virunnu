import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendRawWhatsApp } from "@/services/notification.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ catererId: string }> }) {
  const { catererId } = await params;
  const caterer = await db.caterer.findUnique({ where: { id: catererId } });
  if (!caterer || !caterer.approved || caterer.disabled) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, phone, eventDate, guestCount, message } = body;

  if (!name?.trim() || !phone?.trim()) return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });

  const enquiry = await db.cateringEnquiry.create({
    data: {
      catererId,
      name: name.trim(),
      phone: phone.trim(),
      eventDate: eventDate ? new Date(eventDate) : null,
      guestCount: guestCount ? parseInt(guestCount) : null,
      message: message?.trim() || null,
    },
  });

  // Notify caterer via WhatsApp
  const toPhone = caterer.whatsappNumber || caterer.phone;
  const eventStr = eventDate ? new Date(eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not specified";
  const notifyMsg = `🔔 *New Enquiry — ${caterer.name}*\n\n👤 *${name}*\n📞 ${phone}\n📅 Event date: ${eventStr}${guestCount ? `\n👥 Guests: ${guestCount}` : ""}${message ? `\n💬 ${message}` : ""}\n\nReply to this customer directly on ${phone}`;

  sendRawWhatsApp(toPhone, notifyMsg).catch(() => {});

  return NextResponse.json({ enquiry }, { status: 201 });
}
