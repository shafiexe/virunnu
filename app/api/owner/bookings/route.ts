import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { BookingStatus, SlotStatus } from "@prisma/client";

const schema = z.object({
  venueId: z.string().cuid(),
  hallId: z.string().cuid(),
  templateId: z.string().cuid(),
  date: z.string().date(),
  customerPhone: z.string().min(10).max(15),
  customerName: z.string().min(1).max(100).optional(),
  amountRupees: z.number().int().min(1),
  advanceRupees: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { venueId, hallId, templateId, date, customerPhone, customerName, amountRupees, advanceRupees } = parsed.data;

  // Verify hall belongs to this owner's venue
  const hall = await db.hall.findFirst({
    where: { id: hallId, venueId, venue: { orgId: session.orgId! } },
  });
  if (!hall) return NextResponse.json({ error: "Hall not found" }, { status: 404 });

  // Find or create customer
  let user = await db.user.findUnique({ where: { phone: customerPhone } });
  if (!user) {
    user = await db.user.create({
      data: { phone: customerPhone, name: customerName ?? null, role: "CUSTOMER" },
    });
  } else if (customerName && !user.name) {
    user = await db.user.update({ where: { id: user.id }, data: { name: customerName } });
  }

  const dateObj = new Date(date);

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.hallSlot.findUnique({
      where: { hallId_templateId_date: { hallId, templateId, date: dateObj } },
    });

    if (existing && existing.status !== SlotStatus.AVAILABLE) {
      throw new Error("SLOT_UNAVAILABLE");
    }

    let slotId: string;
    if (!existing) {
      const created = await tx.hallSlot.create({
        data: { hallId, templateId, date: dateObj, status: SlotStatus.BOOKED },
      });
      slotId = created.id;
    } else {
      await tx.hallSlot.update({
        where: { id: existing.id },
        data: { status: SlotStatus.BOOKED, heldUntil: null },
      });
      slotId = existing.id;
    }

    const totalPaise = amountRupees * 100;
    const advPaise = advanceRupees != null ? advanceRupees * 100 : null;
    const bookingStatus =
      advPaise != null && advPaise > 0 && advPaise < totalPaise
        ? BookingStatus.ADVANCE_PAID
        : BookingStatus.CONFIRMED;

    const booking = await tx.booking.create({
      data: {
        hallSlotId: slotId,
        userId: user!.id,
        orgId: session.orgId!,
        totalPaise,
        advancePaise: advPaise,
        status: bookingStatus,
        paymentMethod: "CASH",
      },
    });

    return booking;
  }).catch((err) => {
    if (err instanceof Error && err.message === "SLOT_UNAVAILABLE") return null;
    throw err;
  });

  if (!result) {
    return NextResponse.json({ error: "Slot is already booked or on hold" }, { status: 409 });
  }

  return NextResponse.json({ booking: result, user }, { status: 201 });
}
