import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  city: z.string().min(1),
  state: z.string().optional(),
  description: z.string().optional(),
  cuisines: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const caterer = await db.caterer.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      city: parsed.data.city,
      state: parsed.data.state ?? "Kerala",
      description: parsed.data.description ?? null,
      cuisines: parsed.data.cuisines ?? [],
      approved: true,
    },
  });

  return NextResponse.json({ catererId: caterer.id }, { status: 201 });
}
