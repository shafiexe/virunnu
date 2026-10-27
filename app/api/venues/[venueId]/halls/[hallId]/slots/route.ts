import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getHallAvailability } from "@/services/venue.service";
import { releaseExpiredHolds } from "@/services/booking.service";

const schema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ venueId: string; hallId: string }> }
) {
  const { hallId } = await params;
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = schema.safeParse(sp);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "from and to dates required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  await releaseExpiredHolds();
  const slots = await getHallAvailability(
    hallId,
    new Date(parsed.data.from),
    new Date(parsed.data.to)
  );
  return NextResponse.json({ slots });
}
