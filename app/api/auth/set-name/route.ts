import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const schema = z.object({ name: z.string().min(2).max(60) });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name must be 2–60 characters" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.userId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ ok: true, needsRole: true });
}
