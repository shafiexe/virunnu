import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "CATERER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const caterer = await db.caterer.findFirst({ where: { orgId: session.orgId ?? undefined } });
  if (!caterer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const enquiry = await db.cateringEnquiry.findUnique({ where: { id } });
  if (!enquiry || enquiry.catererId !== caterer.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { status } = await req.json();
  if (!["ATTENDED", "IGNORED"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updated = await db.cateringEnquiry.update({ where: { id }, data: { status } });
  return NextResponse.json({ enquiry: updated });
}
