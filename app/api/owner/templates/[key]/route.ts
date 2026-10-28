import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { TEMPLATE_KEYS, type TemplateKey } from "@/services/notification.service";

const putSchema = z.object({
  body: z.string().min(1),
  subject: z.string().nullable().optional(),
});

type Params = { params: Promise<{ key: string }> };

function resolveKey(raw: string): TemplateKey | null {
  return (TEMPLATE_KEYS as readonly string[]).includes(raw) ? (raw as TemplateKey) : null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key: rawKey } = await params;
  const key = resolveKey(rawKey);
  if (!key) return NextResponse.json({ error: "Unknown template key" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const orgId = session.orgId!;

  await db.orgMessageTemplate.upsert({
    where: { orgId_key: { orgId, key } },
    create: { orgId, key, body: parsed.data.body, subject: parsed.data.subject ?? null },
    update: { body: parsed.data.body, subject: parsed.data.subject ?? null },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key: rawKey } = await params;
  const key = resolveKey(rawKey);
  if (!key) return NextResponse.json({ error: "Unknown template key" }, { status: 404 });

  const orgId = session.orgId!;

  await db.orgMessageTemplate.deleteMany({ where: { orgId, key } });

  return NextResponse.json({ ok: true });
}
