import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CATERER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caterer = await db.caterer.findFirst({ where: { orgId: session.orgId ?? undefined } });
  if (!caterer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const {
    whatsappNumber, email, instagramUrl, facebookUrl, youtubeUrl, websiteUrl,
    services, photos, description, cuisines,
  } = body;

  const updated = await db.caterer.update({
    where: { id: caterer.id },
    data: {
      ...(whatsappNumber !== undefined && { whatsappNumber: whatsappNumber || null }),
      ...(email !== undefined && { email: email || null }),
      ...(instagramUrl !== undefined && { instagramUrl: instagramUrl || null }),
      ...(facebookUrl !== undefined && { facebookUrl: facebookUrl || null }),
      ...(youtubeUrl !== undefined && { youtubeUrl: youtubeUrl || null }),
      ...(websiteUrl !== undefined && { websiteUrl: websiteUrl || null }),
      ...(services !== undefined && { services }),
      ...(photos !== undefined && { photos }),
      ...(description !== undefined && { description: description || null }),
      ...(cuisines !== undefined && { cuisines }),
    },
  });

  return NextResponse.json({ caterer: updated });
}
