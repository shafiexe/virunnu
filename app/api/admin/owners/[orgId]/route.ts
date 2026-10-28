import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  orgName: z.string().min(2).optional(),
  ownerName: z.string().min(1).optional(),
  ownerPhone: z.string().min(10).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orgId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { orgName, ownerName, ownerPhone } = parsed.data;

  const org = await db.organization.findFirst({ where: { id: orgId, type: "CONVENTION" } });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await db.$transaction(async (tx) => {
      if (orgName) await tx.organization.update({ where: { id: orgId }, data: { name: orgName } });

      const owner = await tx.user.findFirst({ where: { orgId, role: "OWNER" } });
      if (owner && (ownerName || ownerPhone)) {
        if (ownerPhone && ownerPhone !== owner.phone) {
          const taken = await tx.user.findUnique({ where: { phone: ownerPhone } });
          if (taken) throw new Error("PHONE_TAKEN");
        }
        await tx.user.update({
          where: { id: owner.id },
          data: { ...(ownerName ? { name: ownerName } : {}), ...(ownerPhone ? { phone: ownerPhone } : {}) },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "PHONE_TAKEN") {
      return NextResponse.json({ error: "A user with that phone already exists" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orgId } = await params;

  const org = await db.organization.findFirst({
    where: { id: orgId, type: "CONVENTION" },
    include: {
      venues: { include: { halls: { select: { id: true } } } },
    },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hallIds = org.venues.flatMap((v) => v.halls.map((h) => h.id));
  const venueIds = org.venues.map((v) => v.id);

  try {
    await db.$transaction(async (tx) => {
      // 1. Payments → Bookings → HallSlots (leaf dependencies first)
      if (hallIds.length > 0) {
        const slotIds = (await tx.hallSlot.findMany({ where: { hallId: { in: hallIds } }, select: { id: true } })).map((s) => s.id);
        if (slotIds.length > 0) {
          await tx.payment.deleteMany({ where: { booking: { hallSlotId: { in: slotIds } } } });
          await tx.booking.deleteMany({ where: { hallSlotId: { in: slotIds } } });
          await tx.hallSlot.deleteMany({ where: { hallId: { in: hallIds } } });
        }
        // SlotTemplates, photos, blocked dates cascade from Hall; delete halls manually
        await tx.slotTemplate.deleteMany({ where: { hallId: { in: hallIds } } });
        await tx.hallPhoto.deleteMany({ where: { hallId: { in: hallIds } } });
        await tx.blockedDate.deleteMany({ where: { hallId: { in: hallIds } } });
        await tx.hall.deleteMany({ where: { id: { in: hallIds } } });
      }

      // 2. Venues
      if (venueIds.length > 0) {
        await tx.venue.deleteMany({ where: { id: { in: venueIds } } });
      }

      // 3. Employees & Expenses
      await tx.employee.deleteMany({ where: { orgId } });
      await tx.expense.deleteMany({ where: { orgId } });

      // 4. Caterers owned by this org
      await tx.caterer.deleteMany({ where: { orgId } });

      // 5. Users (owners / staff)
      await tx.user.deleteMany({ where: { orgId } });

      // 6. Organization — cascade handles Facility, OrgMessageTemplate, ExpenseCategory/Item
      await tx.organization.delete({ where: { id: orgId } });
    });
  } catch (err) {
    console.error("org DELETE error", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
