import { BILL_LABEL, billMoney, formatInvoiceDate, rs, type BillTypeKey } from "@/lib/caterer-orders";
import { renderTemplate } from "@/lib/caterer-templates";

// wa.me wants digits only, with the country code
export const whatsappLink = (phone: string, text: string) => {
  const d = phone.replace(/\D/g, "");
  const full = d.length === 10 ? `91${d}` : d;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
};

type Money = { subtotalPaise: number; discountPaise: number; taxPaise: number; receivedPaise: number };

const balanceLine = (paise: number) => (paise > 0 ? `*Balance: ${rs(paise)}*` : "Balance: Nil (closed)");

export function billMessage(o: { catererName: string; customerName: string; number: number; type: BillTypeKey; date: Date | string; bill: Money; url: string }) {
  const m = billMoney(o.bill);
  return renderTemplate("caterer_invoice", {
    businessName: o.catererName, customerName: o.customerName, billLabel: BILL_LABEL[o.type].toLowerCase(), invoiceNo: `Invoice ${o.number}`,
    functionDate: formatInvoiceDate(o.date), total: rs(m.netPaise), received: rs(o.bill.receivedPaise), balance: rs(m.balancePaise), balanceLine: balanceLine(m.balancePaise), link: o.url,
  });
}

export function orderMessage(o: { catererName: string; customerName: string; date: Date | string; bills: (Money & { number: number; type: BillTypeKey })[]; url: string }) {
  const total = o.bills.reduce((s, b) => s + billMoney(b).netPaise, 0);
  const received = o.bills.reduce((s, b) => s + b.receivedPaise, 0);
  const balance = Math.max(0, total - received);
  return renderTemplate("caterer_invoices", {
    businessName: o.catererName, customerName: o.customerName, functionDate: formatInvoiceDate(o.date),
    invoiceLines: o.bills.map((b) => `Invoice ${b.number} · ${BILL_LABEL[b.type]}: ${rs(billMoney(b).netPaise)}`).join("\n"),
    total: rs(total), received: rs(received), balance: rs(balance), balanceLine: balanceLine(balance), link: o.url,
  });
}

export function statementMessage(o: { catererName: string; customerName: string; billedPaise: number; receivedPaise: number; balancePaise: number; url: string }) {
  return renderTemplate("caterer_statement", {
    businessName: o.catererName, customerName: o.customerName, billed: rs(o.billedPaise), received: rs(o.receivedPaise),
    balance: rs(o.balancePaise), balanceLine: balanceLine(o.balancePaise), link: o.url,
  });
}

export function quoteMessage(o: { catererName: string; customerName: string; label: string; date: Date | string; totalPaise: number; validUntil: Date | null; url: string }) {
  return renderTemplate("caterer_quotation", {
    businessName: o.catererName, customerName: o.customerName, quoteNo: o.label, functionDate: formatInvoiceDate(o.date), total: rs(o.totalPaise),
    validLine: o.validUntil ? `Price valid until ${formatInvoiceDate(o.validUntil)}` : "", link: o.url,
  });
}

// A polite nudge for money still owed. `invoices` reads like "Invoice 12" or "3 invoices"; `date` is the function the money is for.
export function reminderMessage(o: { catererName: string; customerName: string; balancePaise: number; invoices: string; date: Date | string; upiId?: string | null; url: string }) {
  return renderTemplate("caterer_reminder", {
    businessName: o.catererName, customerName: o.customerName, balance: rs(o.balancePaise), invoiceNo: o.invoices, functionDate: formatInvoiceDate(o.date),
    upiLine: o.upiId ? `Pay by UPI to ${o.upiId}.` : "", link: o.url,
  });
}
