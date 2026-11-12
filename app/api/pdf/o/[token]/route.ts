import { NextResponse } from "next/server";
import { loadOrderByToken } from "@/lib/caterer-bills";
import { invoicePdfResponse } from "@/lib/caterer-pdf-response";

// PDF of all of a function's invoices for anyone holding the order's share link
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const order = await loadOrderByToken((await params).token);
  if (!order || order.status === "CANCELLED" || order.bills.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return invoicePdfResponse(order.caterer, order.customer, order, order.bills);
}
