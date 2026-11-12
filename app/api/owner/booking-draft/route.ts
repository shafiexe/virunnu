import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/session";
import { cleanDraft, draftPrompt } from "@/lib/booking-draft";

const schema = z.object({
  text: z.string().trim().min(5, "Paste the message first").max(2000),
  slots: z.array(z.object({ id: z.string(), name: z.string(), startTime: z.string(), endTime: z.string() })).max(12),
});

// Reads a pasted WhatsApp message or note and suggests the booking form's values. Nothing is saved here.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Message reading is not set up yet" }, { status: 503 });

  const { text, slots } = parsed.data;
  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  try {
    const message = await new Anthropic().messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 400,
      messages: [{ role: "user", content: draftPrompt(text, slots, todayISO) }],
    });
    const out = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");
    const json = out.match(/\{[\s\S]*\}/);
    if (!json) return NextResponse.json({ error: "Could not read that message. Try the fields below." }, { status: 422 });
    return NextResponse.json({ draft: cleanDraft(JSON.parse(json[0]), slots, todayISO) });
  } catch {
    return NextResponse.json({ error: "Could not read that message. Try the fields below." }, { status: 502 });
  }
}
