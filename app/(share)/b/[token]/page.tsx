import { connection } from "next/server";
export const instant = false;
import { notFound } from "next/navigation";
import { loadBillByToken } from "@/lib/caterer-bills";
import { toInvoiceBill, toParty } from "@/lib/caterer-invoice-data";
import { orgLogoUrl } from "@/lib/org-logo";
import { CatererInvoice } from "@/components/caterer-invoice";
import { PrintButton } from "@/components/print-button";
import { PdfButton } from "@/components/pdf-button";

export default async function SharedBillPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const bill = await loadBillByToken(token);
  if (!bill || bill.order.status === "CANCELLED") notFound();

  return (
    <div className="py-6">
      <style>{`@media print { body { background: white !important } .no-print { display: none !important } }`}</style>
      <div className="no-print max-w-3xl mx-auto px-5 pb-4 flex justify-end gap-2"><PdfButton href={`/api/pdf/b/${token}`} /><PrintButton /></div>
      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none">
        <CatererInvoice party={toParty(bill.order.caterer, bill.order.customer, bill.order, await orgLogoUrl(bill.order.caterer.orgId))} bills={[toInvoiceBill(bill)]} />
      </div>
    </div>
  );
}
