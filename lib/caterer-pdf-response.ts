import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/caterer-invoice-pdf";
import { toInvoiceBill, toParty } from "@/lib/caterer-invoice-data";
import { quoteDoc, type QuoteRow } from "@/lib/caterer-quotes";

type CatererRow = Parameters<typeof toParty>[0] & { orgId: string | null };
type CustomerRow = Parameters<typeof toParty>[1];
type BillRow = Parameters<typeof toInvoiceBill>[0];

// The business logo as PNG/JPEG bytes (a PDF cannot hold WebP, so those are converted), or null
async function logoBytes(orgId: string | null) {
  if (!orgId) return null;
  const logo = await db.orgLogo.findUnique({ where: { orgId } });
  if (!logo) return null;
  const data = Buffer.from(logo.data);
  if (logo.contentType === "image/png" || logo.contentType === "image/jpeg") return data;
  try {
    const { default: sharp } = await import("sharp");
    return await sharp(data).png().toBuffer();
  } catch {
    return null;
  }
}

const safe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "customer";

// One PDF download for a group of bills of the same function
export async function invoicePdfResponse(caterer: CatererRow, customer: CustomerRow, order: { date: Date; place: string | null }, bills: BillRow[]) {
  const pdf = await renderInvoicePdf(toParty(caterer, customer, order), bills.map(toInvoiceBill), await logoBytes(caterer.orgId));
  const name = `Invoice-${bills.map((b) => b.number).join("-")}-${safe(customer.name)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}

export async function quotePdfResponse(q: NonNullable<QuoteRow>) {
  const doc = quoteDoc(q);
  const pdf = await renderInvoicePdf(doc.party, doc.bills, await logoBytes(q.caterer.orgId), doc.info);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Quotation-${doc.info.label}-${safe(q.customer.name)}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
