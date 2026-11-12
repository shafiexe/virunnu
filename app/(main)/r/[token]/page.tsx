import { connection } from "next/server";
export const instant = false;
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadReceipt } from "@/lib/booking-receipt";
import { ReceiptView } from "@/components/receipt-view";
import { PrintButton } from "@/components/print-button";

// A receipt is private to whoever was sent the link, so search engines must not list it
export const metadata: Metadata = { title: "Payment receipt", robots: { index: false, follow: false } };

// What a customer opens from the link the venue sent them: one receipt, nothing else about the venue's books.
export default async function PublicReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  // tokens are long random strings; anything else is not worth a database look-up
  if (!/^[a-z0-9]{20,80}$/i.test(token)) notFound();
  const r = await loadReceipt({ shareToken: token });
  if (!r) notFound();

  return (
    <>
      <style>{`@media print { header, aside, footer, nav { display: none !important; } body > div, main { padding: 0 !important; } }`}</style>
      <div className="print:hidden border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Receipt {r.no}</span>
        <PrintButton />
      </div>
      <ReceiptView r={r} />
    </>
  );
}
