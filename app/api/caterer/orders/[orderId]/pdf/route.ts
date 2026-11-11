import { NextRequest, NextResponse } from "next/server";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadOrder } from "@/lib/caterer-bills";
import { invoicePdfResponse } from "@/lib/caterer-pdf-response";

// PDF of the order's invoice: ?bill=FOOD or SERVICE for one, nothing for both
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const ctx = await getCatererForSession();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { orderId } = await params;
  const order = await loadOrder(orderId, ctx.caterer.id);
  if (!order || order.bills.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const want = req.nextUrl.searchParams.get("bill");
  const bills = want === "FOOD" || want === "SERVICE" ? order.bills.filter((b) => b.type === want) : order.bills;
  if (bills.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return invoicePdfResponse(ctx.caterer, order.customer, order, bills);
}
