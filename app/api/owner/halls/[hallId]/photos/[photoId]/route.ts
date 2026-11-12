import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { deleteImage } from "@/lib/image-store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ hallId: string; photoId: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { hallId, photoId } = await params;
  const photo = await db.hallPhoto.findUnique({ where: { id: photoId }, include: { hall: { include: { venue: { select: { orgId: true } } } } } });
  if (!photo || photo.hallId !== hallId || (session.role !== "ADMIN" && photo.hall.venue.orgId !== session.orgId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.hallPhoto.delete({ where: { id: photoId } });

  // the saved copy goes with it (a photo that was only a link has nothing to remove)
  await deleteImage(photo.url);

  return NextResponse.json({ ok: true });
}
