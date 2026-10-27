import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ hallId: string; photoId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { hallId, photoId } = await params;
  const photo = await db.hallPhoto.findUnique({ where: { id: photoId }, include: { hall: { include: { venue: { select: { orgId: true } } } } } });
  if (!photo || photo.hallId !== hallId || photo.hall.venue.orgId !== session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.hallPhoto.delete({ where: { id: photoId } });

  // Best-effort file removal
  try {
    const filepath = path.join(process.cwd(), "public", photo.url);
    await unlink(filepath);
  } catch { /* ignore if file already gone */ }

  return NextResponse.json({ ok: true });
}
