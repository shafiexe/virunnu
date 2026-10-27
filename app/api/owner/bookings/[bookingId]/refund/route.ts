import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ bookingId: string }> };

const schema = z.object({
  refundPaise: z.number().int().min(0),
  refundNote: z.string().max(300).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { bookingId } = await params;
  const booking = await db.booking.findFirst({ where: { id: bookingId, orgId: session.orgId } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (booking.status !== "CANCELLED")
    return NextResponse.json({ error: "Refunds only apply to cancelled bookings" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  if (parsed.data.refundPaise > booking.totalPaise)
    return NextResponse.json({ error: "Refund cannot exceed booking total" }, { status: 400 });

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      refundPaise: parsed.data.refundPaise,
      refundNote: parsed.data.refundNote ?? null,
    },
  });

  return NextResponse.json({ booking: updated });
}
