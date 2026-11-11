import { connection } from "next/server";
export const instant = false;
import { redirect, notFound } from "next/navigation";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadOrder } from "@/lib/caterer-bills";
import { toInvoiceBill, toParty } from "@/lib/caterer-invoice-data";
import { orgLogoUrl } from "@/lib/org-logo";
import { CatererInvoice } from "@/components/caterer-invoice";
import { CatererInvoiceShare } from "@/components/caterer-invoice-share";
import { BackToList } from "@/components/back-to-list";
import { PrintButton } from "@/components/print-button";
import { PdfButton } from "@/components/pdf-button";
import { AutoPrint } from "@/components/auto-print";

export default async function CatererInvoicePage({
  params, searchParams,
}: { params: Promise<{ orderId: string }>; searchParams: Promise<{ bill?: string; print?: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { orderId } = await params;
  const { bill, print } = await searchParams;
  const order = await loadOrder(orderId, ctx.caterer.id);
  if (!order || order.bills.length === 0) notFound();

  const wanted = bill === "FOOD" || bill === "SERVICE" ? bill : "ALL";
  const shown = wanted === "ALL" ? order.bills : order.bills.filter((b) => b.type === wanted);
  const selected = shown.length === order.bills.length && order.bills.length > 1 ? "ALL" : (shown[0]?.type ?? "ALL");
  if (shown.length === 0) redirect(`/caterer/orders/${order.id}/invoice`);

  return (
    <>
      {print === "1" && <AutoPrint />}
      <style>{`@media print { header, aside, nav, footer, .no-print { display: none !important } body > div, main { padding: 0 !important } }`}</style>
      <div className="no-print mx-auto max-w-3xl px-4 pt-6 space-y-3">
        <BackToList href={`/caterer/orders/${order.id}`} label="Back to order" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CatererInvoiceShare
            orderId={order.id} orderToken={order.shareToken} orderDate={order.date.toISOString()}
            customer={{ name: order.customer.name, phone: order.customer.phone }} catererName={ctx.caterer.name} selected={selected}
            bills={order.bills.map((b) => ({ number: b.number, type: b.type, shareToken: b.shareToken, subtotalPaise: b.subtotalPaise, discountPaise: b.discountPaise, taxPaise: b.taxPaise, receivedPaise: b.receivedPaise }))}
          />
          <div className="flex items-center gap-2"><PdfButton href={`/api/caterer/orders/${order.id}/pdf${selected === "ALL" ? "" : `?bill=${selected}`}`} /><PrintButton /></div>
        </div>
      </div>
      <div className="mt-4 mb-10 mx-auto max-w-3xl rounded-2xl bg-white shadow-sm border border-zinc-200 print:border-0 print:shadow-none print:m-0">
        <CatererInvoice party={toParty(ctx.caterer, order.customer, order, await orgLogoUrl(ctx.caterer.orgId))} bills={shown.map(toInvoiceBill)} />
      </div>
    </>
  );
}
