import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  hallId: z.string().cuid(),
  date: z.string().date(),
  reason: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { hallId, date, reason } = parsed.data;

  // Verify hall belongs to this org
  const hall = await db.hall.findFirst({
    where: { id: hallId, venue: { orgId: session.orgId! } },
  });
  if (!hall) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const blocked = await db.blockedDate.upsert({
    where: { hallId_date: { hallId, date: new Date(date) } },
    create: { hallId, date: new Date(date), reason: reason ?? null },
    update: { reason: reason ?? null },
  });

  return NextResponse.json({ blocked }, { status: 201 });
}
