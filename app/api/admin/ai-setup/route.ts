import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { matchAmenities } from "@/lib/facility-catalog";

const VENUE_TYPES = ["CONVENTION_CENTER", "AUDITORIUM", "BANQUET_HALL", "RESORT", "HOTEL_RESTAURANT"] as const;

const venueSchema = z.object({
  name: z.string().min(1),
  venueType: z.enum(VENUE_TYPES).default("CONVENTION_CENTER"),
  address: z.string().default(""),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsappPhone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  googleMapsUrl: z.string().nullable().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const hallSchema = z.object({
  name: z.string().min(1),
  capacitySeated: z.number().int().min(1).default(100),
  priceRupees: z.number().int().min(0).default(10000),
});

const bodySchema = z.object({
  orgId: z.string().min(1),
  venue: venueSchema,
  halls: z.array(hallSchema).max(20).default([]),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string().url()).max(20).default([]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { orgId, venue: venueData, halls, amenities, photos } = parsed.data;

  const org = await db.organization.findFirst({ where: { id: orgId, type: "CONVENTION" } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const matchedFacilities = matchAmenities(amenities);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const DAYS = 60;
  const DEFAULT_SLOT_DEFS = [
    { name: "Morning", startTime: "08:00", endTime: "14:00" },
    { name: "Evening", startTime: "15:00", endTime: "21:00" },
  ];

  try {
    // ── Step 1: venue + halls + facilities in a short transaction ──────────────
    const { venueId, createdHalls, facilitiesAdded, hallTemplates } = await db.$transaction(async (tx) => {
      const venueName = venueData.name || org.name;
      const venueFields = {
        name: venueName,
        venueType: venueData.venueType,
        address: venueData.address || "Address not set — please edit",
        city: venueData.city ?? null,
        phone: venueData.phone ?? null,
        whatsappPhone: venueData.whatsappPhone ?? null,
        email: venueData.email ?? null,
        websiteUrl: venueData.websiteUrl ?? null,
        instagramUrl: venueData.instagramUrl ?? null,
        facebookUrl: venueData.facebookUrl ?? null,
        googleMapsUrl: venueData.googleMapsUrl ?? null,
        lat: venueData.lat ?? 0,
        lng: venueData.lng ?? 0,
      };

      const existingVenue = await tx.venue.findFirst({ where: { orgId } });
      const venue = existingVenue
        ? await tx.venue.update({ where: { id: existingVenue.id }, data: venueFields })
        : await tx.venue.create({ data: { ...venueFields, approved: true, orgId } });

      // Create halls + slot templates (no slots yet — done in bulk after)
      const createdHalls: string[] = [];
      const hallTemplates: { hallId: string; templateId: string }[] = [];

      for (const hall of halls) {
        const h = await tx.hall.create({
          data: {
            name: hall.name,
            capacity: hall.capacitySeated,
            pricePerSlot: Math.max(hall.priceRupees, 1) * 100,
            minimumAdvancePaise: 50000,
            requireFullPayment: false,
            amenities: [],
            venueId: venue.id,
          },
        });

        for (const slotDef of DEFAULT_SLOT_DEFS) {
          const tpl = await tx.slotTemplate.create({
            data: { name: slotDef.name, startTime: slotDef.startTime, endTime: slotDef.endTime, hallId: h.id },
          });
          hallTemplates.push({ hallId: h.id, templateId: tpl.id });
        }

        createdHalls.push(h.name);
      }

      // Facilities
      const existing = await tx.facility.findMany({ where: { orgId }, select: { name: true } });
      const existingNames = new Set(existing.map(f => f.name.toLowerCase()));
      const toCreate = matchedFacilities.filter(f => !existingNames.has(f.name.toLowerCase()));

      if (toCreate.length > 0) {
        await tx.facility.createMany({
          data: toCreate.map((f, i) => ({
            orgId,
            name: f.name,
            description: f.description,
            amountPaise: 0,
            category: f.category,
            icon: f.icon,
            isCustom: false,
            sortOrder: existing.length + i,
          })),
        });
      }

      return {
        venueId: venue.id,
        createdHalls,
        facilitiesAdded: toCreate.map(f => f.name),
        hallTemplates,
      };
    });

    // ── Step 2: bulk-insert hall slots outside the transaction ─────────────────
    if (hallTemplates.length > 0) {
      const slotRows = hallTemplates.flatMap(({ hallId, templateId }) =>
        Array.from({ length: DAYS }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          return { hallId, templateId, date, status: "AVAILABLE" as const };
        })
      );
      await db.hallSlot.createMany({ data: slotRows, skipDuplicates: true });
    }

    // ── Step 3: add extracted photos to the first hall ─────────────────────────
    const firstHallId = hallTemplates[0]?.hallId ?? null;
    if (firstHallId && photos.length > 0) {
      await db.hallPhoto.createMany({
        data: photos.slice(0, 20).map((url, i) => ({
          hallId: firstHallId,
          url,
          caption: null,
          sortOrder: i,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ venueId, hallsCreated: createdHalls, facilitiesAdded, photosAdded: photos.length }, { status: 201 });
  } catch (err) {
    console.error("ai-setup error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
