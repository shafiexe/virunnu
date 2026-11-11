import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { syncStartingPrice } from "@/lib/caterer-details";

type Params = { params: Promise<{ itemId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "CATERER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { itemId } = await params;

  const item = await db.catererItem.findUnique({ where: { id: itemId } });
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

  // "Removing from the menu" takes the dish off the public page; it stays in the price list for orders
  await db.catererItem.update({ where: { id: itemId }, data: { showOnPublic: false } });
  await syncStartingPrice(item.catererId);
  return NextResponse.json({ ok: true });
}
