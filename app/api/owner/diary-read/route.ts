import { aiLimited } from "@/lib/ai-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { cleanDiaryEntries, diaryPrompt } from "@/lib/diary";

// a page photo is shrunk in the browser first, so this stays well inside a serverless request
const schema = z.object({
  hallId: z.string().cuid(),
  image: z.string().min(100).max(4_200_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

// Reads one photographed page of the venue's paper diary into a list of bookings. Nothing is saved here and the photo is not kept.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER" || !session.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const slow = aiLimited("diary-read", session);
  if (slow) return slow;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send a photo of a diary page" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Reading the diary is not set up yet" }, { status: 503 });

  const hall = await db.hall.findFirst({ where: { id: parsed.data.hallId, venue: { orgId: session.orgId } }, include: { slotTemplates: { orderBy: { startTime: "asc" } } } });
  if (!hall) return NextResponse.json({ error: "Hall not found" }, { status: 404 });
  const slots = hall.slotTemplates.map((t) => ({ id: t.id, name: t.name, startTime: t.startTime, endTime: t.endTime }));
  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  try {
    const message = await new Anthropic().messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: parsed.data.mediaType, data: parsed.data.image } },
        { type: "text", text: diaryPrompt(slots, todayISO) },
      ] }],
    });
    const out = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    const json = out.match(/\{[\s\S]*\}/);
    if (!json) return NextResponse.json({ error: "Could not read that page. Try a clearer, straighter photo." }, { status: 422 });
    return NextResponse.json({ entries: cleanDiaryEntries(JSON.parse(json[0]), slots, todayISO) });
  } catch {
    return NextResponse.json({ error: "Could not read that page. Try again, or a clearer photo." }, { status: 502 });
  }
}
