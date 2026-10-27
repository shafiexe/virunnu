import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ bookingId: string }> };

const schema = z.object({
  discountPaise: z.number().int().min(0),
  discountReason: z.string().max(300).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { bookingId } = await params;
  const booking = await db.booking.findFirst({ where: { id: bookingId, orgId: session.orgId } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (booking.status === "CANCELLED" || booking.status === "EXPIRED")
    return NextResponse.json({ error: "Cannot discount a cancelled or expired booking" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  if (parsed.data.discountPaise > booking.totalPaise)
    return NextResponse.json({ error: "Discount cannot exceed total amount" }, { status: 400 });

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      discountPaise: parsed.data.discountPaise,
      discountReason: parsed.data.discountReason ?? null,
    },
  });

  return NextResponse.json({ booking: updated });
}
