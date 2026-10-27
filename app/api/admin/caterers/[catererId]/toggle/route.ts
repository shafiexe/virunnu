import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ catererId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { catererId } = await params;

  const caterer = await db.caterer.findUnique({ where: { id: catererId } });
  if (!caterer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.caterer.update({ where: { id: catererId }, data: { disabled: !caterer.disabled } });

  return NextResponse.json({ disabled: !caterer.disabled });
}
