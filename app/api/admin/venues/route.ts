import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const VENUE_TYPES = ["CONVENTION_CENTER", "AUDITORIUM", "BANQUET_HALL", "RESORT", "HOTEL_RESTAURANT"] as const;

const createSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(2),
  venueType: z.enum(VENUE_TYPES).default("CONVENTION_CENTER"),
  address: z.string().min(3),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsappPhone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  googleMapsUrl: z.string().nullable().optional(),
  googleRating: z.number().min(0).max(5).nullable().optional(),
  googleReviewCount: z.number().int().min(0).nullable().optional(),
  googleReviewUrl: z.string().nullable().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { orgId, name, venueType, address, city, phone, whatsappPhone, email,
    websiteUrl, instagramUrl, facebookUrl, googleMapsUrl, googleRating,
    googleReviewCount, googleReviewUrl, lat, lng } = parsed.data;

  const org = await db.organization.findFirst({ where: { id: orgId, type: "CONVENTION" } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const venue = await db.venue.create({
    data: {
      orgId,
      name,
      venueType,
      address,
      city: city ?? null,
      phone: phone ?? null,
      whatsappPhone: whatsappPhone ?? null,
      email: email ?? null,
      websiteUrl: websiteUrl ?? null,
      instagramUrl: instagramUrl ?? null,
      facebookUrl: facebookUrl ?? null,
      googleMapsUrl: googleMapsUrl ?? null,
      googleRating: googleRating ?? null,
      googleReviewCount: googleReviewCount ?? null,
      googleReviewUrl: googleReviewUrl ?? null,
      lat: lat ?? 0,
      lng: lng ?? 0,
      approved: false,
    },
  });

  return NextResponse.json({ venue }, { status: 201 });
}
