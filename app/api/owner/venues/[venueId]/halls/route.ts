import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(80),
  capacity: z.number().int().min(1),
  priceRupees: z.number().int().min(1),
  amenities: z.array(z.string()).default([]),
  slots: z.array(z.object({
    name: z.string().min(1),
    startTime: z.string(),
    endTime: z.string(),
  })).min(1),
});

type Params = { params: Promise<{ venueId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { venueId } = await params;
  const venue = await db.venue.findFirst({ where: { id: venueId, orgId: session.orgId! } });
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, capacity, priceRupees, amenities, slots } = parsed.data;

  const hall = await db.$transaction(async (tx) => {
    const newHall = await tx.hall.create({
      data: {
        name,
        capacity,
        pricePerSlot: priceRupees * 100,
        amenities,
        venueId,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const slotDef of slots) {
      const template = await tx.slotTemplate.create({
        data: { name: slotDef.name, startTime: slotDef.startTime, endTime: slotDef.endTime, hallId: newHall.id },
      });
      for (let i = 0; i < 60; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        await tx.hallSlot.create({
          data: { hallId: newHall.id, templateId: template.id, date, status: "AVAILABLE" },
        });
      }
    }

    return tx.hall.findUnique({
      where: { id: newHall.id },
      include: { slotTemplates: true },
    });
  });

  return NextResponse.json({ hall }, { status: 201 });
}
