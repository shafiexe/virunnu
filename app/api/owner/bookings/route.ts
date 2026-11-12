import { notRequests } from "@/lib/booking-requests";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import { BookingStatus, SlotStatus } from "@prisma/client";
import { priceAddon } from "@/lib/addons";
import { asDay, todayISO } from "@/lib/booking-ledger";
import { actorOf, logActivity } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(500, Math.max(25, parseInt(sp.get("pageSize") ?? "50") || 50));
  const search = (sp.get("search") ?? "").trim();
  const status = sp.get("status") ?? "ALL";

  const where = {
    orgId: session.orgId!,
    status: status !== "ALL" ? (status as BookingStatus) : notRequests,
    ...(search ? {
      OR: [
        { user: { name: { contains: search, mode: "insensitive" as const } } },
        { user: { phone: { contains: search } } },
        { guestName: { contains: search, mode: "insensitive" as const } },
        { guestPhone: { contains: search } },
      ],
    } : {}),
  };

  const [total, data] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      include: {
        user: { select: { phone: true, name: true } },
        hallSlot: { include: { template: true, hall: { include: { venue: { select: { id: true, name: true } } } } } },
        payment: true,
        addons: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // people who may not see phone numbers get them blanked
  const hide = session.deny?.includes("hide.phones");
  const shown = hide ? data.map((b) => ({ ...b, guestPhone: null, user: b.user ? { ...b.user, phone: "" } : b.user })) : data;
  return NextResponse.json({ data: shown, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

const schema = z.object({
  venueId: z.string().cuid(),
  hallId: z.string().cuid(),
  templateId: z.string().cuid(),
  date: z.string().date(),
  customerPhone: z.string().min(10).max(15),
  customerName: z.string().min(1).max(100).optional(),
  amountRupees: z.number().int().min(1),
  advanceRupees: z.number().int().min(0).optional(),
  addons: z.array(z.object({ id: z.string(), quantity: z.number().min(0.5).max(48).default(1) })).max(20).optional(),
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

  const { venueId, hallId, templateId, date, customerPhone, customerName, amountRupees, advanceRupees, addons: addonPicks } = parsed.data;

  // Verify hall belongs to this owner's venue
  const hall = await db.hall.findFirst({
    where: { id: hallId, venueId, venue: { orgId: session.orgId! } },
  });
  if (!hall) return NextResponse.json({ error: "Hall not found" }, { status: 404 });

  const dateObj = new Date(date);

  const dateBlocked = await db.blockedDate.findUnique({ where: { hallId_date: { hallId, date: dateObj } } });
  if (dateBlocked) {
    return NextResponse.json({ error: "This date is blocked — unblock it before adding a booking" }, { status: 409 });
  }

  // Chosen add-ons are priced from the venue's own list, never from the request
  const venueAddons = addonPicks?.length
    ? await db.venueAddon.findMany({ where: { id: { in: addonPicks.map((p) => p.id) }, venueId, active: true } })
    : [];
  if (venueAddons.length !== new Set((addonPicks ?? []).map((p) => p.id)).size) {
    return NextResponse.json({ error: "An add-on you picked is no longer available" }, { status: 400 });
  }
  const addons = venueAddons.map((a) => ({ name: a.name, ...priceAddon(a, addonPicks!.find((p) => p.id === a.id)!.quantity) }));
  const addonsPaise = addons.reduce((sum, a) => sum + a.pricePaise, 0);

  // Find or create customer
  let user = await db.user.findUnique({ where: { phone: customerPhone } });
  if (!user) {
    user = await db.user.create({
      data: { phone: customerPhone, name: customerName ?? null, role: "CUSTOMER" },
    });
  } else if (customerName && !user.name) {
    user = await db.user.update({ where: { id: user.id }, data: { name: customerName } });
  }

  const actor = await actorOf(session);
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

    const totalPaise = amountRupees * 100 + addonsPaise;
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
        addons: { create: addons },
        // what was handed over at the time is the first entry in the booking's payments
        ...(advPaise != null && advPaise > 0 ? { payments: { create: { orgId: session.orgId!, amountPaise: Math.min(advPaise, totalPaise), method: "CASH", paidOn: asDay(todayISO()), recordedBy: actor.label } } } : {}),
      },
    });

    return booking;
  }).catch((err) => {
    if (err instanceof Error && err.message === "SLOT_UNAVAILABLE") return null;
    throw err;
  });

  if (!result) {
    return NextResponse.json({ error: "That slot is booked, held or blocked — unblock it first" }, { status: 409 });
  }

  await logActivity(session, `Added a booking for ${customerName ?? customerPhone} on ${date}`);
  return NextResponse.json({ booking: result, user }, { status: 201 });
}
