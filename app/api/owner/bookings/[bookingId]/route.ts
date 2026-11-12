import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { BookingStatus, SlotStatus } from "@prisma/client";
import { priceAddon } from "@/lib/addons";
import { actorOf } from "@/lib/activity";
import { asDay, todayISO } from "@/lib/booking-ledger";

type Params = { params: Promise<{ bookingId: string }> };

const patchSchema = z.object({
  customerName: z.string().min(1).max(100).optional(),
  amountRupees: z.number().int().min(1).optional(),
  additionalAdvanceRupees: z.number().int().min(0).optional(),
  // venue add-ons to put on this booking, hours changes for ones already on it, and ones to take off
  addAddons: z.array(z.object({ id: z.string(), quantity: z.number().min(0.5).max(48).default(1) })).max(20).optional(),
  updateAddons: z.array(z.object({ id: z.string(), quantity: z.number().min(0.5).max(48) })).max(20).optional(),
  removeAddonIds: z.array(z.string()).max(20).optional(),
  // one-off services typed in for this booking (optionally remembered in the venue's add-on list)
  customAddons: z
    .array(z.object({
      name: z.string().trim().min(1).max(60),
      priceRupees: z.number().int().min(0).max(10000000),
      unit: z.enum(["FIXED", "HOUR"]).default("FIXED"),
      quantity: z.number().min(0.5).max(48).default(1),
      saveToVenue: z.boolean().default(false),
    }))
    .max(10)
    .optional(),
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
    include: { user: true, addons: true, hallSlot: { include: { hall: { include: { venue: true } } } } },
  });

  if (!booking || booking.hallSlot.hall.venue.orgId !== session.orgId!) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { customerName, amountRupees, additionalAdvanceRupees, addAddons, updateAddons, removeAddonIds, customAddons } = parsed.data;

  // Work out the add-ons the booking will have after this edit (new ones are priced from the venue list)
  const removing = new Set(removeAddonIds ?? []);
  const venueAddons = addAddons?.length
    ? await db.venueAddon.findMany({ where: { id: { in: addAddons.map((p) => p.id) }, venueId: booking.hallSlot.hall.venueId, active: true } })
    : [];
  if (venueAddons.length !== new Set((addAddons ?? []).map((p) => p.id)).size) {
    return NextResponse.json({ error: "An add-on you picked is no longer available" }, { status: 400 });
  }
  const toAdd = [
    ...venueAddons.map((a) => ({ name: a.name, ...priceAddon(a, addAddons!.find((p) => p.id === a.id)!.quantity) })),
    ...(customAddons ?? []).map((c) => ({ name: c.name, ...priceAddon({ unit: c.unit, pricePaise: c.priceRupees * 100 }, c.quantity) })),
  ];

  // Hours change on add-ons already on the booking: keep the price they were booked at
  const hoursChange = new Map((updateAddons ?? []).map((u) => [u.id, u.quantity]));
  const updated = booking.addons
    .filter((a) => !removing.has(a.id) && a.unit === "HOUR" && hoursChange.has(a.id) && hoursChange.get(a.id) !== a.quantity)
    .map((a) => ({ id: a.id, ...priceAddon({ unit: "HOUR", pricePaise: a.unitPricePaise ?? a.pricePaise }, hoursChange.get(a.id)!) }));
  const updatedById = new Map(updated.map((u) => [u.id, u]));

  const addonsChanged = removing.size > 0 || toAdd.length > 0 || updated.length > 0;
  const addonsPaise =
    booking.addons.filter((a) => !removing.has(a.id)).reduce((s, a) => s + (updatedById.get(a.id)?.pricePaise ?? a.pricePaise), 0) +
    toAdd.reduce((s, a) => s + a.pricePaise, 0);
  const currentAddonsPaise = booking.addons.reduce((s, a) => s + a.pricePaise, 0);
  const totalChanged = amountRupees !== undefined || addonsChanged;

  // amountRupees is the hall charge; add-ons stay on top of it
  const hallPaise = amountRupees !== undefined ? amountRupees * 100 : booking.totalPaise - currentAddonsPaise;
  const totalPaise = totalChanged ? hallPaise + addonsPaise : booking.totalPaise;
  let newAdvancePaise = booking.advancePaise;
  let newStatus = booking.status;

  let receivedNow = 0;
  if (additionalAdvanceRupees !== undefined && additionalAdvanceRupees > 0) {
    newAdvancePaise = (booking.advancePaise ?? 0) + additionalAdvanceRupees * 100;
    if (newAdvancePaise >= totalPaise) {
      newAdvancePaise = totalPaise;
      newStatus = BookingStatus.CONFIRMED;
    } else {
      newStatus = BookingStatus.ADVANCE_PAID;
    }
    receivedNow = newAdvancePaise - (booking.advancePaise ?? 0);
  } else if (totalChanged && booking.advancePaise != null) {
    if (booking.advancePaise >= totalPaise) {
      newStatus = BookingStatus.CONFIRMED;
    } else if (booking.advancePaise > 0) {
      newStatus = BookingStatus.ADVANCE_PAID;
    }
  }

  // Remember typed-in services in the venue list (skipping names it already has) so they're one tap next time
  const saveable = (customAddons ?? []).filter((c) => c.saveToVenue);
  if (saveable.length) {
    const venueId = booking.hallSlot.hall.venueId;
    const have = await db.venueAddon.findMany({ where: { venueId }, select: { name: true } });
    const names = new Set(have.map((h) => h.name.toLowerCase()));
    const fresh = saveable.filter((c, i) => !names.has(c.name.toLowerCase()) && saveable.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase()) === i);
    if (fresh.length) {
      await db.venueAddon.createMany({
        data: fresh.map((c, i) => ({ venueId, name: c.name, pricePaise: c.priceRupees * 100, unit: c.unit, sortOrder: have.length + i })),
      });
    }
  }

  await db.$transaction([
    ...(removing.size ? [db.bookingAddon.deleteMany({ where: { bookingId, id: { in: [...removing] } } })] : []),
    ...updated.map((u) => db.bookingAddon.update({ where: { id: u.id }, data: { quantity: u.quantity, pricePaise: u.pricePaise } })),
    ...toAdd.map((a) => db.bookingAddon.create({ data: { bookingId, ...a } })),
  ]);

  const actor = receivedNow > 0 ? await actorOf(session) : null;
  await Promise.all([
    receivedNow > 0
      ? db.bookingPayment.create({ data: { bookingId, orgId: session.orgId!, amountPaise: receivedNow, method: "CASH", paidOn: asDay(todayISO()), recordedBy: actor?.label ?? null } })
      : null,
    db.booking.update({
      where: { id: bookingId },
      data: {
        ...(totalChanged ? { totalPaise } : {}),
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
