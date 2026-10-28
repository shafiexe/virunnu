import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const VENUE_TYPES = ["CONVENTION_CENTER", "AUDITORIUM", "BANQUET_HALL", "RESORT", "HOTEL_RESTAURANT"] as const;

// Mirror of facilities-manager CATALOG for server-side matching
const FACILITY_CATALOG = [
  { name: "Air Conditioning", category: "VENUE",      icon: "ac_unit",          description: "Full AC coverage for all guests" },
  { name: "Parking",          category: "PARKING",    icon: "local_parking",    description: "Dedicated vehicle parking area" },
  { name: "Wi-Fi",            category: "VENUE",      icon: "wifi",             description: "High-speed wireless internet" },
  { name: "Generator",        category: "VENUE",      icon: "local_gas_station",description: "Diesel generator for power backup" },
  { name: "Backup Power / UPS",category:"VENUE",      icon: "backup",           description: "Uninterrupted power supply" },
  { name: "CCTV",             category: "VENUE",      icon: "tv",               description: "24/7 security surveillance cameras" },
  { name: "Security Guard",   category: "SERVICES",   icon: "security",         description: "On-site security personnel" },
  { name: "Kitchen",          category: "SERVICES",   icon: "kitchen",          description: "Fully equipped catering kitchen" },
  { name: "Stage & Decor",    category: "DECORATION", icon: "celebration",      description: "Elevated stage with backdrop" },
  { name: "Sound System",     category: "AV",         icon: "speaker",          description: "Professional PA with microphones" },
  { name: "Projector & Screen",category:"AV",         icon: "videocam",         description: "HD projector with large screen" },
  { name: "Garden / Lawn",    category: "VENUE",      icon: "park",             description: "Open outdoor lawn space" },
  { name: "Catering Service", category: "SERVICES",   icon: "restaurant",       description: "In-house food and beverage service" },
  { name: "Flower Decoration",category: "DECORATION", icon: "local_florist",    description: "Floral arrangements and bouquets" },
  { name: "Photography",      category: "MEDIA",      icon: "photo_camera",     description: "Professional event photographer" },
  { name: "Extra Seating",    category: "VENUE",      icon: "chair",            description: "Additional chairs and tables" },
  { name: "Accessibility",    category: "VENUE",      icon: "accessible",       description: "Ramps and accessible facilities" },
  { name: "Bike Parking",     category: "PARKING",    icon: "two_wheeler",      description: "Two-wheeler parking area" },
  { name: "Beverages Counter",category: "SERVICES",   icon: "local_bar",        description: "Soft drinks, tea and coffee station" },
  { name: "Event Coordination",category:"SERVICES",   icon: "event",            description: "On-site event coordinator" },
  { name: "Valet Parking",    category: "PARKING",    icon: "local_parking",    description: "Attendant-managed valet service" },
  { name: "WiFi Access",      category: "SERVICES",   icon: "wifi",             description: "High-speed internet for guests" },
] as const;

const KEYWORD_MAP: [string, string][] = [
  ["air condition", "Air Conditioning"], ["ac", "Air Conditioning"], ["a/c", "Air Conditioning"],
  ["parking", "Parking"],
  ["wi-fi", "Wi-Fi"], ["wifi", "Wi-Fi"], ["internet", "Wi-Fi"],
  ["generator", "Generator"], ["genset", "Generator"], ["dg set", "Generator"],
  ["ups", "Backup Power / UPS"], ["backup power", "Backup Power / UPS"],
  ["cctv", "CCTV"], ["surveillance", "CCTV"], ["camera", "CCTV"],
  ["security", "Security Guard"], ["guard", "Security Guard"],
  ["kitchen", "Kitchen"], ["catering kitchen", "Kitchen"],
  ["stage", "Stage & Decor"], ["decor", "Stage & Decor"],
  ["sound", "Sound System"], ["pa system", "Sound System"], ["audio", "Sound System"], ["microphone", "Sound System"],
  ["projector", "Projector & Screen"], ["led screen", "Projector & Screen"],
  ["lawn", "Garden / Lawn"], ["garden", "Garden / Lawn"], ["outdoor", "Garden / Lawn"],
  ["catering", "Catering Service"], ["restaurant", "Catering Service"],
  ["flower", "Flower Decoration"], ["floral", "Flower Decoration"],
  ["photo", "Photography"], ["photographer", "Photography"],
  ["seating", "Extra Seating"], ["chairs", "Extra Seating"],
  ["wheelchair", "Accessibility"], ["ramp", "Accessibility"],
  ["bike", "Bike Parking"], ["two-wheeler", "Bike Parking"], ["motorbike", "Bike Parking"],
  ["beverage", "Beverages Counter"], ["tea", "Beverages Counter"], ["coffee", "Beverages Counter"],
  ["coordinator", "Event Coordination"], ["event management", "Event Coordination"],
  ["valet", "Valet Parking"],
];

function matchAmenities(names: string[]): typeof FACILITY_CATALOG[number][] {
  const matched = new Set<string>();
  for (const name of names) {
    const lower = name.toLowerCase();
    const direct = FACILITY_CATALOG.find(c => c.name.toLowerCase() === lower);
    if (direct) { matched.add(direct.name); continue; }
    for (const [kw, catalogName] of KEYWORD_MAP) {
      if (lower.includes(kw)) { matched.add(catalogName); break; }
    }
  }
  return [...FACILITY_CATALOG].filter(c => matched.has(c.name));
}

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

  const { orgId, venue: venueData, halls, amenities } = parsed.data;

  const org = await db.organization.findFirst({ where: { id: orgId, type: "CONVENTION" } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const matchedFacilities = matchAmenities(amenities);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db.$transaction(async (tx) => {
    // 1. Create or update venue
    let venue = await tx.venue.findFirst({ where: { orgId } });
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

    if (venue) {
      venue = await tx.venue.update({ where: { id: venue.id }, data: venueFields });
    } else {
      venue = await tx.venue.create({ data: { ...venueFields, approved: false, orgId } });
    }

    // 2. Create halls with default slot templates (Morning + Evening, 90 days)
    const createdHalls: string[] = [];
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

      const defaultSlots = [
        { name: "Morning", startTime: "08:00", endTime: "14:00" },
        { name: "Evening", startTime: "14:00", endTime: "22:00" },
      ];

      for (const slotDef of defaultSlots) {
        const template = await tx.slotTemplate.create({
          data: { name: slotDef.name, startTime: slotDef.startTime, endTime: slotDef.endTime, hallId: h.id },
        });
        for (let i = 0; i < 90; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          await tx.hallSlot.create({
            data: { hallId: h.id, templateId: template.id, date, status: "AVAILABLE" },
          });
        }
      }

      createdHalls.push(h.name);
    }

    // 3. Add matched amenities as facilities (skip any that already exist by name)
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
      hallsCreated: createdHalls,
      facilitiesAdded: toCreate.map(f => f.name),
    };
  });

  return NextResponse.json(result, { status: 201 });
}
