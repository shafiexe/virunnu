import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Razorpay from "razorpay";
import { checkOnlineAmount, PaymentRefused, quoteSlot } from "@/lib/online-payment";
import { clientIp, rateLimited } from "@/lib/rate-limit";

const schema = z.object({
  hallSlotId: z.string(),
  amountPaise: z.number().int().positive(),
  isFullPayment: z.boolean(),
  guestName: z.string().min(1),
  guestPhone: z.string().min(10),
  guestEmail: z.string().nullable().optional(),
  guestAddress: z.string().nullable().optional(),
  addons: z.array(z.object({ id: z.string(), quantity: z.number().min(0.5).max(48).default(1) })).max(20).optional(),
});

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { hallSlotId, amountPaise, isFullPayment, guestName, guestPhone, guestEmail, guestAddress, addons } = parsed.data;

  // an order is a real request to the payment gateway, so one visitor cannot open them without end
  if (rateLimited(`order:${clientIp(req)}`, 20, 60 * 60_000)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  // what the booking costs and what may be paid now are decided here, from the venue's own prices and rules, not from the browser
  try {
    const quote = await quoteSlot(hallSlotId, addons);
    const problem = checkOnlineAmount({ isFullPayment, amountPaise, ...quote });
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  } catch (e) {
    if (e instanceof PaymentRefused) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  try {
    const order = await getRazorpay().orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: hallSlotId.slice(0, 40),
      notes: {
        hallSlotId,
        amountPaise: String(amountPaise),
        isFullPayment: isFullPayment ? "1" : "0",
        guestName,
        guestPhone,
        guestEmail: guestEmail ?? "",
        guestAddress: guestAddress ?? "",
      },
    });
    return NextResponse.json({ orderId: order.id, amount: amountPaise });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-order] Razorpay error:", msg);
    return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
  }
}
