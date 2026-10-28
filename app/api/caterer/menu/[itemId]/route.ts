import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ itemId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "CATERER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId } = await params;

  const item = await db.menuItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // For caterers, verify ownership; admins can delete any item
  if (session.role === "CATERER") {
    const caterer = session.orgId
      ? await db.caterer.findFirst({ where: { orgId: session.orgId } })
      : null;
    if (!caterer || item.catererId !== caterer.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  await db.menuItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
