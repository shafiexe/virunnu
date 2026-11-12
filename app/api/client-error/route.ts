import { NextRequest, NextResponse } from "next/server";
import { raiseAlert } from "@/lib/alert";
import { clientIp, rateLimited } from "@/lib/rate-limit";

// Pages that crash in someone's browser report here, so a broken screen reaches the owner of Virunnu instead of only the visitor.
export async function POST(req: NextRequest) {
  if (rateLimited(`client-error:${clientIp(req)}`, 5, 10 * 60_000)) return NextResponse.json({ ok: true });
  const body = await req.json().catch(() => null) as { message?: unknown; page?: unknown } | null;
  const message = String(body?.message ?? "").slice(0, 300);
  const page = String(body?.page ?? "").slice(0, 200);
  if (message) await raiseAlert("A page crashed in the browser", `${page}\n${message}`);
  return NextResponse.json({ ok: true });
}
