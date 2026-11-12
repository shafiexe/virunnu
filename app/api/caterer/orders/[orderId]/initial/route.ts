import { NextResponse } from "next/server";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadOrderInitial } from "@/lib/caterer-order-initial";

// An earlier order in the shape the order form starts from, to begin a new one from it. Notes and discounts belong to that function, so they are left out.
export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const loaded = await loadOrderInitial(ctx.caterer.id, (await params).orderId);
  if (!loaded) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ initial: { ...loaded.initial, notes: null, foodDiscountPaise: 0, foodDiscountReason: null, serviceDiscountPaise: 0, serviceDiscountReason: null } });
}
