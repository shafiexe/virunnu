import { NextResponse } from "next/server";
import { loadBillByToken } from "@/lib/caterer-bills";
import { invoicePdfResponse } from "@/lib/caterer-pdf-response";

// PDF of one invoice for anyone holding its share link
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const bill = await loadBillByToken((await params).token);
  if (!bill || bill.order.status === "CANCELLED") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return invoicePdfResponse(bill.order.caterer, bill.order.customer, bill.order, [bill]);
}
