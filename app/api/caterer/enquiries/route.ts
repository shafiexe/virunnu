import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "CATERER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caterer = await db.caterer.findFirst({ where: { orgId: session.orgId ?? undefined } });
  if (!caterer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const enquiries = await db.cateringEnquiry.findMany({
    where: { catererId: caterer.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ enquiries });
}
