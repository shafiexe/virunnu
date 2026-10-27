import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({
  businessName: z.string().min(2).max(80),
  contactPhone: z.string().regex(/^\d{10}$/),
  city: z.string().min(1),
  description: z.string().max(500).optional(),
  cuisines: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "CATERER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { businessName, contactPhone, city, description, cuisines } = parsed.data;

  const caterer = await db.caterer.create({
    data: {
      name: businessName,
      phone: contactPhone,
      city,
      description,
      cuisines: cuisines ?? [],
      orgId: session.orgId ?? null,
    },
  });

  return NextResponse.json({ ok: true, catererId: caterer.id });
}
