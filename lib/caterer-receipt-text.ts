import { formatInvoiceDate, rs } from "@/lib/caterer-orders";

// The WhatsApp text that goes with a caterer's receipt link. Pure, so the order page can build it in the browser.
export function catererReceiptText(o: { catererName: string; customerName: string; amountPaise: number; method: string; paidOn: Date | string; billNo: number; netPaise: number; paidUpToNow: number; link: string }) {
  const balance = Math.max(0, o.netPaise - o.paidUpToNow);
  return [
    `Hello ${o.customerName}, ${o.catererName} has received ${rs(o.amountPaise)} (${o.method}) on ${formatInvoiceDate(o.paidOn)} towards invoice ${o.billNo}.`,
    `Total ${rs(o.netPaise)}, received so far ${rs(o.paidUpToNow)}, ${balance > 0 ? `balance ${rs(balance)}` : "fully paid"}.`,
    `Your receipt: ${o.link}`,
  ].join("\n");
}
