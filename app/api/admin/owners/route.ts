import { importVenuePhotos } from "@/lib/image-store";
import { NextRequest, NextResponse, after } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { centerSchema, createCenter, CenterError, sendCenterCredentials } from "@/services/center-setup.service";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orgs = await db.organization.findMany({
    where: { type: "CONVENTION" },
    include: {
      users: { where: { role: "OWNER" }, select: { id: true, name: true, phone: true } },
      venues: { select: { id: true, name: true, approved: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orgs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = centerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  if (!parsed.data.email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  try {
    const created = await createCenter(parsed.data);
    // the photo links the new account came with are copied into our own storage once the response has gone
    after(() => importVenuePhotos(created.venueId, created.orgId));
    sendCenterCredentials({ name: parsed.data.name, phone: created.phone, email: parsed.data.email, password: created.password });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof CenterError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[admin/owners POST]", err);
    return NextResponse.json({ error: "Could not create the convention center" }, { status: 500 });
  }
}
