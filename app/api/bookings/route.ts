import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { withGST } from "@/lib/gst";
import { releaseExpiredHolds } from "@/services/booking.service";
import { notifyOwnerNewBooking } from "@/services/notification.service";

const HOLD_MINUTES = 15;
const VIRTUAL_PREFIX = "virtual_";
const BLOCKED_PREFIX = "blocked_";

const schema = z.object({
  hallSlotId: z.string().min(1),
  guestName: z.string().min(1, "Name is required"),
  guestPhone: z.string().min(10, "Valid phone number required"),
  guestEmail: z.string().email().optional().or(z.literal("")),
  guestAddress: z.string().optional(),
});

async function materializeVirtualSlot(virtualId: string): Promise<string> {
  const rest = virtualId.slice(VIRTUAL_PREFIX.length);
  const dateStr = rest.slice(-10);
  const templateId = rest.slice(0, rest.length - 11);
  const template = await db.slotTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("SLOT_NOT_FOUND");
  const date = new Date(dateStr + "T00:00:00.000Z");
  const blocked = await db.blockedDate.findFirst({ where: { hallId: template.hallId, date } });
  if (blocked) throw new Error("SLOT_UNAVAILABLE");
  const slot = await db.hallSlot.upsert({
    where: { hallId_templateId_date: { hallId: template.hallId, templateId, date } },
    create: { hallId: template.hallId, templateId, date, status: "AVAILABLE" },
    update: {},
  });
  return slot.id;
}

export async function POST(req: NextRequest) {
  await releaseExpiredHolds();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  let { hallSlotId, guestName, guestPhone, guestEmail, guestAddress } = parsed.data;

  if (hallSlotId.startsWith(VIRTUAL_PREFIX) || hallSlotId.startsWith(BLOCKED_PREFIX)) {
    try {
      const normalizedId = hallSlotId.startsWith(BLOCKED_PREFIX)
        ? hallSlotId.replace(BLOCKED_PREFIX, VIRTUAL_PREFIX)
        : hallSlotId;
      hallSlotId = await materializeVirtualSlot(normalizedId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "SLOT_UNAVAILABLE") return NextResponse.json({ error: "Slot is no longer available" }, { status: 409 });
      if (msg === "SLOT_NOT_FOUND") return NextResponse.json({ error: "Slot not found" }, { status: 404 });
      throw err;
    }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const slot = await tx.hallSlot.findUnique({
        where: { id: hallSlotId },
        include: { hall: { include: { venue: true } }, template: true },
      });

      if (!slot) throw new Error("SLOT_NOT_FOUND");
      // Block requests on already-booked slots; allow AVAILABLE (and ignore HELD — someone may be mid-payment)
      if (slot.status === "BOOKED") throw new Error("SLOT_UNAVAILABLE");

      // Do NOT hold the slot — this is a contact request, not a reservation.
      // The slot stays AVAILABLE so other customers can still pay & book.
      // Owner will call the customer and approve/reject manually.

      const { totalPaise } = withGST(slot.priceOverride ?? slot.hall.pricePerSlot);

      const booking = await tx.booking.create({
        data: {
          hallSlotId,
          orgId: slot.hall.venue.orgId,
          totalPaise,
          status: "PENDING",
          guestName,
          guestPhone,
          guestEmail: guestEmail || null,
          guestAddress: guestAddress || null,
        },
      });

      return {
        booking,
        heldUntil: null,
        minimumAdvancePaise: slot.hall.minimumAdvancePaise,
        requireFullPayment: slot.hall.requireFullPayment,
        venueName: slot.hall.venue.name,
        venuePhone: slot.hall.venue.phone,
        orgId: slot.hall.venue.orgId,
        hallName: slot.hall.name,
        slotDate: slot.date,
        templateName: slot.template?.name,
        templateStart: slot.template?.startTime,
        templateEnd: slot.template?.endTime,
      };
    });

    // Fire owner notification non-blocking — don't delay the response
    db.user.findFirst({
      where: { orgId: result.orgId, role: "OWNER" },
      select: { phone: true, email: true },
    }).then((owner) => {
      if (!owner) return;
      const dateStr = new Date(result.slotDate).toLocaleDateString("en-IN", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      const timeSlot = result.templateName
        ? `${result.templateName} (${result.templateStart}–${result.templateEnd})`
        : "";
      notifyOwnerNewBooking({
        orgId: result.orgId,
        ownerPhone: owner.phone,
        ownerEmail: owner.email,
        customerName: guestName,
        customerPhone: guestPhone,
        venueName: result.venueName,
        hallName: result.hallName,
        date: dateStr,
        timeSlot,
        totalPaise: result.booking.totalPaise,
        bookingRef: result.booking.id.slice(-8).toUpperCase(),
      }).catch((e) => console.error("[notify-owner]", e));
    }).catch((e) => console.error("[notify-owner-lookup]", e));

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "SLOT_UNAVAILABLE") return NextResponse.json({ error: "Slot is no longer available" }, { status: 409 });
    if (msg === "SLOT_NOT_FOUND") return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    throw err;
  }
}
