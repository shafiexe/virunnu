import { NextRequest, NextResponse } from "next/server";
import { handleWebhook } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  try {
    await handleWebhook(body, signature);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "INVALID_SIGNATURE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}
