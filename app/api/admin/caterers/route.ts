import { importCatererPhotos } from "@/lib/image-store";
import { NextRequest, NextResponse, after } from "next/server";
import { getSession } from "@/lib/session";
import { catererSchema, createCaterer, sendCatererCredentials } from "@/services/caterer-setup.service";
import { CenterError } from "@/services/center-setup.service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = catererSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  try {
    const created = await createCaterer(parsed.data);
    // the photo links the new account came with are copied into our own storage once the response has gone
    after(() => importCatererPhotos(created.catererId, created.orgId));
    sendCatererCredentials({ name: parsed.data.name, phone: created.phone, email: parsed.data.email, password: created.password });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof CenterError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[admin/caterers POST]", err);
    return NextResponse.json({ error: "Could not create the catering team" }, { status: 500 });
  }
}
