import { NextRequest, NextResponse } from "next/server";
import { getVenue } from "@/services/venue.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const { venueId } = await params;
  const venue = await getVenue(venueId);
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ venue });
}
