import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ hallId: string }> };

const schema = z.object({
  name: z.string().min(1).max(60),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { hallId } = await params;
  const whereClause = session.role === "ADMIN"
    ? { id: hallId }
    : { id: hallId, venue: { orgId: session.orgId! } };
  const hall = await db.hall.findFirst({ where: whereClause });
  if (!hall) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, startTime, endTime } = parsed.data;

  const template = await db.$transaction(async (tx) => {
    const tpl = await tx.slotTemplate.create({
      data: { name, startTime, endTime, hallId },
    });

    // Generate HallSlots for the next 60 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      await tx.hallSlot.upsert({
        where: { hallId_templateId_date: { hallId, templateId: tpl.id, date } },
        create: { hallId, templateId: tpl.id, date, status: "AVAILABLE" },
        update: {},
      });
    }
    return tpl;
  });

  return NextResponse.json({ template }, { status: 201 });
}
