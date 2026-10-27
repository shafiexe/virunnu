import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { BookingStatus, SlotStatus } from "@prisma/client";

type Params = { params: Promise<{ bookingId: string }> };

const patchSchema = z.object({
  customerName: z.string().min(1).max(100).optional(),
  amountRupees: z.number().int().min(1).optional(),
  additionalAdvanceRupees: z.number().int().min(0).optional(),
});

const deleteSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bookingId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, hallSlot: { include: { hall: { include: { venue: true } } } } },
  });

  if (!booking || booking.hallSlot.hall.venue.orgId !== session.orgId!) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { customerName, amountRupees, additionalAdvanceRupees } = parsed.data;

  const totalPaise = amountRupees !== undefined ? amountRupees * 100 : booking.totalPaise;
  let newAdvancePaise = booking.advancePaise;
  let newStatus = booking.status;

  if (additionalAdvanceRupees !== undefined && additionalAdvanceRupees > 0) {
    newAdvancePaise = (booking.advancePaise ?? 0) + additionalAdvanceRupees * 100;
    if (newAdvancePaise >= totalPaise) {
      newAdvancePaise = totalPaise;
      newStatus = BookingStatus.CONFIRMED;
    } else {
      newStatus = BookingStatus.ADVANCE_PAID;
    }
  } else if (amountRupees !== undefined && booking.advancePaise != null) {
    if (booking.advancePaise >= totalPaise) {
      newStatus = BookingStatus.CONFIRMED;
    } else if (booking.advancePaise > 0) {
      newStatus = BookingStatus.ADVANCE_PAID;
    }
  }

  await Promise.all([
    db.booking.update({
      where: { id: bookingId },
      data: {
        ...(amountRupees !== undefined ? { totalPaise } : {}),
        ...(newAdvancePaise !== booking.advancePaise ? { advancePaise: newAdvancePaise } : {}),
        ...(newStatus !== booking.status ? { status: newStatus } : {}),
      },
    }),
    customerName !== undefined && booking.userId
      ? db.user.update({ where: { id: booking.userId }, data: { name: customerName } })
      : null,
  ].filter(Boolean));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bookingId } = await params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { hallSlot: { include: { hall: { include: { venue: true } } } } },
  });

  if (!booking || booking.hallSlot.hall.venue.orgId !== session.orgId!) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.status === BookingStatus.CANCELLED) {
    return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  const cancelReason = parsed.success ? (parsed.data.reason ?? null) : null;

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED, cancelReason },
    }),
    db.hallSlot.update({
      where: { id: booking.hallSlotId },
      data: { status: SlotStatus.AVAILABLE, heldUntil: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
