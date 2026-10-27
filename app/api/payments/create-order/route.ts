import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Razorpay from "razorpay";

const schema = z.object({
  hallSlotId: z.string(),
  amountPaise: z.number().int().positive(),
  isFullPayment: z.boolean(),
  guestName: z.string().min(1),
  guestPhone: z.string().min(10),
  guestEmail: z.string().nullable().optional(),
  guestAddress: z.string().nullable().optional(),
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

  const { hallSlotId, amountPaise, isFullPayment, guestName, guestPhone, guestEmail, guestAddress } = parsed.data;

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
