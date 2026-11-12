import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

// Caterers on Virunnu, by name or city, for linking one to a booking. Only what their public page already shows.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ caterers: [] });
  const word = { contains: q, mode: "insensitive" as const };
  const caterers = await db.caterer.findMany({
    where: { approved: true, disabled: false, OR: [{ name: word }, { city: word }] },
    orderBy: { name: "asc" }, take: 8, select: { id: true, name: true, city: true },
  });
  return NextResponse.json({ caterers });
}
