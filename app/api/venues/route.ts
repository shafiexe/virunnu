import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchVenues, createVenue } from "@/services/venue.service";
import { getSession } from "@/lib/session";

const searchSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  date: z.string().optional(),
  guests: z.coerce.number().optional(),
  page: z.coerce.number().default(1),
});

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const params = searchSchema.parse(sp);
  const venues = await searchVenues(params);
  return NextResponse.json({ venues });
}

const createSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string(),
  state: z.string(),
  pincode: z.string().length(6),
  lat: z.number(),
  lng: z.number(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const venue = await createVenue({ ...parsed.data, orgId: session.orgId! });
  return NextResponse.json({ venue }, { status: 201 });
}
