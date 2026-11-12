import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { ImageError, importOrKeep, saveImage } from "@/lib/image-store";

const MAX_PHOTOS = 20;

// Adds a photo to a hall: a file from the person's phone or computer, or a link. A link is copied into our own storage, so it
// cannot expire or be taken down by the other site; a link that cannot be copied is still saved, as before, and the answer says so.
export async function POST(req: NextRequest, { params }: { params: Promise<{ hallId: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { hallId } = await params;
  const hall = await db.hall.findUnique({ where: { id: hallId }, include: { venue: { select: { orgId: true } } } });
  if (!hall || (session.role !== "ADMIN" && hall.venue.orgId !== session.orgId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orgId = hall.venue.orgId;
  const count = await db.hallPhoto.count({ where: { hallId } });
  if (count >= MAX_PHOTOS) return NextResponse.json({ error: `A hall can have up to ${MAX_PHOTOS} photos` }, { status: 400 });

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const link: string = typeof body?.url === "string" ? body.url.trim() : "";
      const caption: string | undefined = body?.caption ?? undefined;
      if (!/^https?:\/\//i.test(link)) return NextResponse.json({ error: "Enter a link that starts with http" }, { status: 400 });
      const { url, copied } = await importOrKeep(link, orgId);
      const photo = await db.hallPhoto.create({ data: { hallId, url, caption, sortOrder: count } });
      return NextResponse.json({ ...photo, copied }, { status: 201 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string | null) ?? undefined;
    if (!file || !file.size) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Max 8 MB per photo" }, { status: 400 });
    const url = await saveImage(Buffer.from(await file.arrayBuffer()), orgId);
    const photo = await db.hallPhoto.create({ data: { hallId, url, caption, sortOrder: count } });
    return NextResponse.json({ ...photo, copied: true }, { status: 201 });
  } catch (e) {
    if (e instanceof ImageError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
