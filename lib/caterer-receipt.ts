import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { orgLogoUrl } from "@/lib/org-logo";
import { getAppUrl } from "@/lib/app-url";
import { BILL_LABEL, billMoney, formatInvoiceDate } from "@/lib/caterer-orders";
import { catererReceiptText } from "@/lib/caterer-receipt-text";
import { METHOD_LABEL } from "@/lib/caterer-books";
import type { ReceiptData } from "@/lib/booking-receipt";

// A caterer's payment, shaped like a venue's receipt so the same page can show either
export async function loadCatererReceipt(where: Prisma.CatererPaymentWhereInput): Promise<ReceiptData> {
  const payment = await db.catererPayment.findFirst({
    where,
    include: { bill: { include: { payments: { orderBy: { createdAt: "asc" }, select: { id: true, amountPaise: true } }, order: { include: { caterer: true, customer: true } } } } },
  });
  // a cancelled function has no receipts to share, same as its invoices
  if (!payment || payment.bill.order.status === "CANCELLED") return null;

  const { bill } = payment;
  const { order } = bill;
  const at = bill.payments.findIndex((p) => p.id === payment.id);
  const net = billMoney(bill).netPaise;
  const paidUpToNow = bill.payments.slice(0, at + 1).reduce((s, p) => s + p.amountPaise, 0);
  const method = METHOD_LABEL[payment.method] ?? payment.method;
  const link = `${getAppUrl()}/r/${payment.shareToken}`;
  const caterer = order.caterer;

  return {
    id: payment.id, bookingId: bill.id, shareToken: payment.shareToken, link,
    no: `R${bill.number}-${at + 1}`, method, note: payment.note, amountPaise: payment.amountPaise,
    paidOn: payment.paidOn.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    customerName: order.customer.name, customerPhone: order.customer.phone,
    business: caterer.name, address: caterer.city,
    towardsTitle: `${BILL_LABEL[bill.type]} · Invoice ${bill.number}`,
    towardsLine: `Function on ${formatInvoiceDate(order.date)}${order.place ? ` · ${order.place}` : ""}`,
    thanksName: caterer.name,
    netPaise: net, paidPaise: paidUpToNow, balancePaise: Math.max(0, net - paidUpToNow),
    logoUrl: await orgLogoUrl(caterer.orgId),
    message: catererReceiptText({ catererName: caterer.name, customerName: order.customer.name, amountPaise: payment.amountPaise, method, paidOn: payment.paidOn, billNo: bill.number, netPaise: net, paidUpToNow, link }),
  };
}
