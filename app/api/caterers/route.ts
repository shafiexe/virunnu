import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city") ?? undefined;

  const caterers = await db.caterer.findMany({
    where: city ? { city: { equals: city, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ caterers });
}
