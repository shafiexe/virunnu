import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, setSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  orgName: z.string().min(2),
  venueName: z.string().min(2),
  address: z.string().min(3),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  lat: z.number().default(0),
  lng: z.number().default(0),
  googleMapsUrl: z.string().optional(),
  googleRating: z.number().min(0).max(5).optional(),
  googleReviewCount: z.number().int().min(0).optional(),
  googleReviewUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  hallName: z.string().min(2),
  capacity: z.number().int().min(1),
  priceRupees: z.number().int().min(1),
  minimumAdvancePaise: z.number().int().min(0).default(50000),
  requireFullPayment: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  slots: z
    .array(z.object({ name: z.string(), startTime: z.string(), endTime: z.string() }))
    .min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const { orgId } = await db.$transaction(async (tx) => {
    // Reuse existing org if owner is adding another venue
    let resolvedOrgId = session.orgId ?? null;
    if (!resolvedOrgId) {
      const org = await tx.organization.create({ data: { name: d.orgName, type: "CONVENTION" } });
      resolvedOrgId = org.id;
    }

    const venue = await tx.venue.create({
      data: {
        name: d.venueName,
        address: d.address,
        city: d.city ?? null,
        state: d.state ?? null,
        pincode: d.pincode ?? null,
        lat: d.lat,
        lng: d.lng,
        googleMapsUrl: d.googleMapsUrl ?? null,
        googleRating: d.googleRating ?? null,
        googleReviewCount: d.googleReviewCount ?? null,
        googleReviewUrl: d.googleReviewUrl ?? null,
        websiteUrl: d.websiteUrl ?? null,
        phone: d.phone ?? null,
        email: d.email ?? null,
        approved: false,
        orgId: resolvedOrgId,
      },
    });

    const hall = await tx.hall.create({
      data: {
        name: d.hallName,
        capacity: d.capacity,
        pricePerSlot: d.priceRupees * 100,
        minimumAdvancePaise: d.minimumAdvancePaise,
        requireFullPayment: d.requireFullPayment,
        amenities: d.amenities,
        venueId: venue.id,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const slotDef of d.slots) {
      const template = await tx.slotTemplate.create({
        data: { name: slotDef.name, startTime: slotDef.startTime, endTime: slotDef.endTime, hallId: hall.id },
      });
      for (let i = 0; i < 60; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        await tx.hallSlot.create({
          data: { hallId: hall.id, templateId: template.id, date, status: "AVAILABLE" },
        });
      }
    }

    await tx.user.update({
      where: { id: session.userId },
      data: { role: "OWNER", orgId: resolvedOrgId },
    });

    return { orgId: resolvedOrgId };
  });

  await setSession({ userId: session.userId, role: "OWNER", orgId });
  return NextResponse.json({ ok: true });
}
