import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  hallId: z.string(),
  templateId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { hallId, templateId, date } = parsed.data;

  // Verify hall belongs to this org
  const hall = await db.hall.findFirst({
    where: { id: hallId, venue: { orgId: session.orgId } },
    select: { id: true },
  });
  if (!hall) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const slotDate = new Date(date + "T00:00:00.000Z");

  const existing = await db.hallSlot.findUnique({
    where: { hallId_templateId_date: { hallId, templateId, date: slotDate } },
    include: { bookings: { where: { status: { notIn: ["CANCELLED", "EXPIRED"] } }, select: { id: true } } },
  });

  if (existing) {
    if (existing.bookings.length > 0)
      return NextResponse.json({ error: "Cannot block a slot with active bookings" }, { status: 409 });

    if (existing.status === "HELD") {
      // Unblock — delete the slot (back to virtual available)
      await db.hallSlot.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "unblocked" });
    } else {
      // Block an existing AVAILABLE slot
      await db.hallSlot.update({ where: { id: existing.id }, data: { status: "HELD", heldUntil: null } });
      return NextResponse.json({ action: "blocked" });
    }
  } else {
    // No slot exists yet — create a HELD (blocked) one
    await db.hallSlot.create({
      data: { hallId, templateId, date: slotDate, status: "HELD", heldUntil: null },
    });
    return NextResponse.json({ action: "blocked" });
  }
}
