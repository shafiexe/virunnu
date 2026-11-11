import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { TEMPLATE_KEYS } from "@/lib/caterer-templates";
import { loadTemplates } from "@/lib/caterer-templates-server";

export async function GET() {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ templates: await loadTemplates(ctx.caterer.orgId), remindAfterDays: ctx.caterer.remindAfterDays });
}

const schema = z.object({
  // an empty text puts the standard wording back
  templates: z.partialRecord(z.enum(TEMPLATE_KEYS), z.string().max(1500)).optional(),
  remindAfterDays: z.number().int().min(0).max(365).optional(),
});

export async function PUT(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const orgId = ctx.caterer.orgId!;

  for (const [key, body] of Object.entries(parsed.data.templates ?? {}) as [string, string][]) {
    if (!body.trim()) await db.orgMessageTemplate.deleteMany({ where: { orgId, key } });
    else await db.orgMessageTemplate.upsert({ where: { orgId_key: { orgId, key } }, create: { orgId, key, body }, update: { body } });
  }
  if (parsed.data.remindAfterDays !== undefined) await db.caterer.update({ where: { id: ctx.caterer.id }, data: { remindAfterDays: parsed.data.remindAfterDays } });
  return NextResponse.json({ templates: await loadTemplates(orgId) });
}
