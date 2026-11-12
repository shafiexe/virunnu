import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { billPrompt, cleanBill } from "@/lib/expense-bill";

// a phone photo is shrunk in the browser first, so this stays well inside a serverless request
const schema = z.object({
  image: z.string().min(100).max(4_200_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

// Reads a photo of a bill and suggests the expense's name, amount, date and category. Nothing is saved here, and the photo is not kept.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "OWNER" && session.role !== "CATERER") || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send a photo of the bill" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Reading bills is not set up yet" }, { status: 503 });

  const categories = (await db.expenseCategory.findMany({ where: { orgId: session.orgId }, orderBy: { sortOrder: "asc" }, select: { name: true } })).map((c) => c.name);
  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  try {
    const message = await new Anthropic().messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 500,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: parsed.data.mediaType, data: parsed.data.image } },
        { type: "text", text: billPrompt(categories, todayISO) },
      ] }],
    });
    const out = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    const json = out.match(/\{[\s\S]*\}/);
    if (!json) return NextResponse.json({ error: "Could not read that bill. Fill the fields in yourself." }, { status: 422 });
    return NextResponse.json({ draft: cleanBill(JSON.parse(json[0]), categories, todayISO) });
  } catch {
    return NextResponse.json({ error: "Could not read that bill. Fill the fields in yourself." }, { status: 502 });
  }
}
