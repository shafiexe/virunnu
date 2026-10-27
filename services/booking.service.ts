import { db } from "@/lib/db";
import { BookingStatus, SlotStatus } from "@prisma/client";
import { splitGST } from "@/lib/gst";
import { notifyBookingExpired } from "@/services/notification.service";

const HOLD_MINUTES = 60;
const VIRTUAL_PREFIX = "virtual_";

async function materializeVirtualSlot(virtualId: string): Promise<string> {
  // ID format: virtual_{templateId}_{YYYY-MM-DD}
  const rest = virtualId.slice(VIRTUAL_PREFIX.length);
  const dateStr = rest.slice(-10);
  const templateId = rest.slice(0, rest.length - 11);

  const template = await db.slotTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("SLOT_NOT_FOUND");

  const date = new Date(dateStr);

  const blocked = await db.blockedDate.findFirst({ where: { hallId: template.hallId, date } });
  if (blocked) throw new Error("SLOT_UNAVAILABLE");

  const slot = await db.hallSlot.upsert({
    where: { hallId_templateId_date: { hallId: template.hallId, templateId, date } },
    create: { hallId: template.hallId, templateId, date, status: "AVAILABLE" },
    update: {},
  });

  return slot.id;
}

export async function createHold(hallSlotId: string, userId: string) {
  if (hallSlotId.startsWith(VIRTUAL_PREFIX)) {
    hallSlotId = await materializeVirtualSlot(hallSlotId);
  }

  return db.$transaction(async (tx) => {
    const slot = await tx.hallSlot.findUnique({
      where: { id: hallSlotId },
      include: { hall: { include: { venue: true } } },
    });

    if (!slot) throw new Error("SLOT_NOT_FOUND");
    if (slot.status !== SlotStatus.AVAILABLE) throw new Error("SLOT_UNAVAILABLE");

    const heldUntil = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

    const updatedSlot = await tx.hallSlot.update({
      where: { id: hallSlotId, status: SlotStatus.AVAILABLE },
      data: { status: SlotStatus.HELD, heldUntil },
    });

    if (!updatedSlot) throw new Error("SLOT_UNAVAILABLE");

    // Owner price is GST-inclusive — use directly as the booking total
    const { totalPaise } = splitGST(slot.priceOverride ?? slot.hall.pricePerSlot);

    const booking = await tx.booking.create({
      data: {
        hallSlotId,
        userId,
        orgId: slot.hall.venue.orgId,
        totalPaise,
        status: BookingStatus.PENDING,
      },
    });

    return { booking, heldUntil };
  });
}

export async function getBooking(bookingId: string) {
  return db.booking.findUnique({
    where: { id: bookingId },
    include: {
      hallSlot: {
        include: {
          template: true,
          hall: { include: { venue: true } },
        },
      },
      payment: true,
    },
  });
}

export async function getPublicBooking(ref: string) {
  const include = {
    hallSlot: {
      include: {
        template: true,
        hall: { include: { venue: { select: { name: true, address: true, phone: true } } } },
      },
    },
    user: { select: { name: true, phone: true } },
  } as const;

  // Short refs (≤8 chars) are the last 8 chars of the booking ID, uppercased.
  // Accept both the short ref and the full ID.
  if (ref.length <= 8) {
    return db.booking.findFirst({ where: { id: { endsWith: ref.toLowerCase() } }, include });
  }
  return db.booking.findUnique({ where: { id: ref }, include });
}

export async function releaseExpiredHolds() {
  const now = new Date();

  const expiredSlots = await db.hallSlot.findMany({
    where: { status: SlotStatus.HELD, heldUntil: { lt: now } },
    include: {
      bookings: {
        where: { status: BookingStatus.PENDING },
        select: {
          guestPhone: true,
          guestName: true,
          user: { select: { phone: true, name: true } },
        },
      },
      template: true,
      hall: { include: { venue: { select: { name: true } } } },
    },
  });

  if (expiredSlots.length === 0) return 0;

  const slotIds = expiredSlots.map((s) => s.id);

  await db.$transaction([
    db.hallSlot.updateMany({
      where: { id: { in: slotIds } },
      data: { status: SlotStatus.AVAILABLE, heldUntil: null },
    }),
    db.booking.updateMany({
      where: { hallSlotId: { in: slotIds }, status: BookingStatus.PENDING },
      data: { status: BookingStatus.EXPIRED },
    }),
  ]);

  // Notify customers non-blocking — one message per expired pending booking
  for (const slot of expiredSlots) {
    for (const booking of slot.bookings) {
      const phone = booking.user?.phone ?? booking.guestPhone;
      if (!phone) continue;
      const dateStr = new Date(slot.date).toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "short", year: "numeric",
      });
      const timeSlot = slot.template
        ? `${slot.template.name} (${slot.template.startTime}–${slot.template.endTime})`
        : "";
      notifyBookingExpired({
        customerPhone: phone,
        customerName: booking.user?.name ?? booking.guestName ?? "Customer",
        venueName: slot.hall.venue.name,
        hallName: slot.hall.name,
        date: dateStr,
        timeSlot,
      }).catch((e) => console.error("[notify/hold-expired]", e));
    }
  }

  return slotIds.length;
}
