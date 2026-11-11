import type { InvoiceBill, InvoiceParty } from "@/components/caterer-invoice";

type CatererRow = { name: string; phone: string; whatsappNumber: string | null; address: string | null; city: string; upiId?: string | null; bankDetails?: string | null; invoiceNote?: string | null; gstin?: string | null };
type CustomerRow = { name: string; phone: string; address: string | null };
type BillRow = {
  number: number; type: "FOOD" | "SERVICE"; createdAt: Date; subtotalPaise: number; discountPaise: number; taxPaise: number; gstRateBp: number; gstInclusive: boolean; gstPaise: number; discountReason: string | null; receivedPaise: number;
  lines: { name: string; unit: string; quantity: number; ratePaise: number; amountPaise: number }[];
};

export const toParty = (caterer: CatererRow, customer: CustomerRow, order: { date: Date; place: string | null }, logoUrl?: string | null): InvoiceParty => ({
  caterer: { name: caterer.name, phone: caterer.phone, whatsappNumber: caterer.whatsappNumber, address: caterer.address, city: caterer.city, upiId: caterer.upiId, bankDetails: caterer.bankDetails, invoiceNote: caterer.invoiceNote, logoUrl, gstin: caterer.gstin },
  customer: { name: customer.name, phone: customer.phone, address: customer.address },
  functionDate: order.date,
  place: order.place,
});

export const toInvoiceBill = (b: BillRow): InvoiceBill => ({
  number: b.number, type: b.type, createdAt: b.createdAt, subtotalPaise: b.subtotalPaise, discountPaise: b.discountPaise, taxPaise: b.taxPaise, gstRateBp: b.gstRateBp, gstInclusive: b.gstInclusive, gstPaise: b.gstPaise,
  discountReason: b.discountReason, receivedPaise: b.receivedPaise,
  lines: b.lines.map((l) => ({ name: l.name, unit: l.unit, quantity: l.quantity, ratePaise: l.ratePaise, amountPaise: l.amountPaise })),
});
