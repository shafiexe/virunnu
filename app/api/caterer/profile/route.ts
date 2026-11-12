import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { after } from "next/server";
import { catererDetailsSchema, detailsToData } from "@/lib/caterer-details";
import { deleteImage, importCatererPhotos } from "@/lib/image-store";

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

  const details = catererDetailsSchema.safeParse(body);
  if (!details.success) return NextResponse.json({ error: details.error.issues[0]?.message }, { status: 400 });

  const updated = await db.caterer.update({
    where: { id: caterer.id },
    data: {
      ...detailsToData(details.data),
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

  if (Array.isArray(photos)) {
    // photos taken off the page lose their saved copy; any that are still only links are copied in the background
    const gone = caterer.photos.filter((u) => !photos.includes(u));
    after(async () => { await Promise.all(gone.map(deleteImage)); await importCatererPhotos(caterer.id, caterer.orgId!); });
  }
  return NextResponse.json({ caterer: updated });
}
