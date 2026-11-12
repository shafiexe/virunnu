import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ImageError, importOrKeep, saveImage } from "@/lib/image-store";

// Saves a photo for the caterer's public page and answers with its address; the page adds it to the list and saves the profile.
// A file from the phone is stored; a link is copied into our storage, or kept as the link when it cannot be copied.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CATERER" || !session.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if ((req.headers.get("content-type") ?? "").includes("application/json")) {
      const body = await req.json().catch(() => null);
      const link: string = typeof body?.url === "string" ? body.url.trim() : "";
      if (!/^https?:\/\//i.test(link)) return NextResponse.json({ error: "Enter a link that starts with http" }, { status: 400 });
      return NextResponse.json(await importOrKeep(link, session.orgId), { status: 201 });
    }
    const file = (await req.formData()).get("file") as File | null;
    if (!file || !file.size) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Max 8 MB per photo" }, { status: 400 });
    return NextResponse.json({ url: await saveImage(Buffer.from(await file.arrayBuffer()), session.orgId), copied: true }, { status: 201 });
  } catch (e) {
    if (e instanceof ImageError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
