import { connection } from "next/server";
export const instant = false;
import { notFound } from "next/navigation";
import { loadOrderByToken } from "@/lib/caterer-bills";
import { toInvoiceBill, toParty } from "@/lib/caterer-invoice-data";
import { orgLogoUrl } from "@/lib/org-logo";
import { CatererInvoice } from "@/components/caterer-invoice";
import { PrintButton } from "@/components/print-button";
import { PdfButton } from "@/components/pdf-button";

export default async function SharedOrderPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const order = await loadOrderByToken(token);
  if (!order || order.status === "CANCELLED" || order.bills.length === 0) notFound();

  return (
    <div className="py-6">
      <style>{`@media print { body { background: white !important } .no-print { display: none !important } }`}</style>
      <div className="no-print max-w-3xl mx-auto px-5 pb-4 flex justify-end gap-2"><PdfButton href={`/api/pdf/o/${token}`} /><PrintButton /></div>
      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none">
        <CatererInvoice party={toParty(order.caterer, order.customer, order, await orgLogoUrl(order.caterer.orgId))} bills={order.bills.map(toInvoiceBill)} />
      </div>
    </div>
  );
}
