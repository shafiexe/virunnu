import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";

const schema = z.object({
  enabled: z.boolean().optional(),
  via: z.enum(["WHATSAPP", "EMAIL", "BOTH"]).optional(),
  email: z.string().trim().max(120).email("That email address does not look right").optional().or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const via = d.via ?? ctx.caterer.summaryVia;
  const email = d.email !== undefined ? d.email || null : ctx.caterer.summaryEmail;
  if (d.enabled && (via === "EMAIL" || via === "BOTH") && !email && !ctx.caterer.email) {
    return NextResponse.json({ error: "Add the email address the summary should go to" }, { status: 400 });
  }
  const updated = await db.caterer.update({
    where: { id: ctx.caterer.id },
    data: { ...(d.enabled !== undefined && { summaryEnabled: d.enabled }), ...(d.via && { summaryVia: d.via }), ...(d.email !== undefined && { summaryEmail: email }) },
  });
  return NextResponse.json({ enabled: updated.summaryEnabled, via: updated.summaryVia, email: updated.summaryEmail });
}
