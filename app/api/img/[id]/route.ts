import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// A photo kept in the database. Public, like the photos on a venue's page; the address is random, and a photo never changes, so it can be cached for good.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const img = await db.storedImage.findUnique({ where: { id }, select: { contentType: true, data: true } });
  if (!img) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(img.data), {
    headers: { "Content-Type": img.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
