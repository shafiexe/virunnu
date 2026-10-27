import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ venueId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { venueId } = await params;
  await db.venue.update({ where: { id: venueId }, data: { approved: true } });
  return NextResponse.redirect(new URL("/admin", _req.url), 303);
}
