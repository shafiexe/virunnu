import { NextResponse } from "next/server";
import { loadQuoteByToken } from "@/lib/caterer-quotes";
import { quotePdfResponse } from "@/lib/caterer-pdf-response";

// PDF of a quotation for anyone holding its share link
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const q = await loadQuoteByToken((await params).token);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return quotePdfResponse(q);
}
