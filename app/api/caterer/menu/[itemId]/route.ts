import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ itemId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "CATERER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId } = await params;

  const caterer = session.orgId
    ? await db.caterer.findFirst({ where: { orgId: session.orgId } })
    : null;

  if (!caterer) {
    return NextResponse.json({ error: "Caterer profile not found" }, { status: 404 });
  }

  const item = await db.menuItem.findUnique({ where: { id: itemId } });
  if (!item || item.catererId !== caterer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.menuItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
