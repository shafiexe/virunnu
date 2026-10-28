import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hallId: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { hallId } = await params;
  const hall = await db.hall.findUnique({ where: { id: hallId }, include: { venue: { select: { orgId: true } } } });
  if (!hall || (session.role !== "ADMIN" && hall.venue.orgId !== session.orgId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  const count = await db.hallPhoto.count({ where: { hallId } });

  // URL-based photo (e.g. Google Maps photo link)
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const url: string = body?.url ?? "";
    const caption: string | undefined = body?.caption ?? undefined;
    if (!url.startsWith("http")) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    const photo = await db.hallPhoto.create({
      data: { hallId, url, caption, sortOrder: count },
    });
    return NextResponse.json(photo, { status: 201 });
  }

  // File upload
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const caption = (formData.get("caption") as string | null) ?? undefined;

  if (!file || !file.size) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowed = ["jpg", "jpeg", "png", "webp", "avif"];
  if (!allowed.includes(ext)) return NextResponse.json({ error: "Image files only (jpg, png, webp)" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Max 8 MB per photo" }, { status: 400 });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "halls", hallId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const photo = await db.hallPhoto.create({
    data: { hallId, url: `/uploads/halls/${hallId}/${filename}`, caption, sortOrder: count },
  });

  return NextResponse.json(photo, { status: 201 });
}
