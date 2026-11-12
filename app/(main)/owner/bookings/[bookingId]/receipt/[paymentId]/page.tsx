import { connection } from "next/server";
export const instant = false;
import { notFound, redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getSession } from "@/lib/session";
import { loadReceipt } from "@/lib/booking-receipt";
import { ReceiptView } from "@/components/receipt-view";
import { PrintButton } from "@/components/print-button";
import { CopyLinkButton } from "@/components/copy-link-button";

type Params = { params: Promise<{ bookingId: string; paymentId: string }> };

// A receipt for one payment, with the ways to send it to the customer.
export default async function ReceiptPage({ params }: Params) {
  await connection();
  const { bookingId, paymentId } = await params;
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");

  const r = await loadReceipt({ id: paymentId, bookingId, orgId: session.orgId! });
  if (!r) notFound();

  const digits = session.deny?.includes("hide.phones") ? "" : r.customerPhone.replace(/\D/g, "").slice(-10);

  return (
    <>
      <style>{`@media print { header, aside, footer, nav { display: none !important; } body > div, main { padding: 0 !important; } }`}</style>
      <div className="print:hidden bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Receipt {r.no}</span>
        <div className="flex flex-wrap gap-2">
          {digits.length === 10 && (
            <a href={`https://wa.me/91${digits}?text=${encodeURIComponent(r.message)}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> Send on WhatsApp</a>
          )}
          <CopyLinkButton url={r.link} label="Copy customer link" />
          <PrintButton />
        </div>
      </div>
      <ReceiptView r={r} />
    </>
  );
}
