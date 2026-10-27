import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

type Params = { params: Promise<{ blockedId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { blockedId } = await params;
  const blocked = await db.blockedDate.findUnique({
    where: { id: blockedId },
    include: { hall: { include: { venue: true } } },
  });

  if (!blocked || blocked.hall.venue.orgId !== session.orgId!) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.blockedDate.delete({ where: { id: blockedId } });
  return NextResponse.json({ ok: true });
}
