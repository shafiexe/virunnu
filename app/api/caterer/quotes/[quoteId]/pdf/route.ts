import { NextResponse } from "next/server";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadQuote } from "@/lib/caterer-quotes";
import { quotePdfResponse } from "@/lib/caterer-pdf-response";

export async function GET(_req: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const q = await loadQuote(ctx.caterer.id, (await params).quoteId);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return quotePdfResponse(q);
}
