import { connection } from "next/server";
export const instant = false;
import { notFound } from "next/navigation";
import { loadQuoteByToken, quoteDoc, quoteState } from "@/lib/caterer-quotes";
import { orgLogoUrl } from "@/lib/org-logo";
import { whatsappLink } from "@/lib/caterer-share";
import { CatererInvoice } from "@/components/caterer-invoice";
import { PrintButton } from "@/components/print-button";
import { PdfButton } from "@/components/pdf-button";

export default async function SharedQuotePage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const q = await loadQuoteByToken(token);
  if (!q) notFound();
  const doc = quoteDoc(q, await orgLogoUrl(q.caterer.orgId));
  const state = quoteState(q);
  const reply = whatsappLink(q.caterer.whatsappNumber || q.caterer.phone, `Hello ${q.caterer.name}, I accept quotation ${doc.info.label}. Please confirm my booking.`);

  return (
    <div className="py-6">
      <style>{`@media print { body { background: white !important } .no-print { display: none !important } }`}</style>
      <div className="no-print max-w-3xl mx-auto px-5 pb-4 flex flex-wrap items-center justify-end gap-2">
        {state === "OPEN" && <a href={reply} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Accept on WhatsApp</a>}
        <PdfButton href={`/api/pdf/q/${token}`} />
        <PrintButton />
      </div>
      {state === "EXPIRED" && <p className="no-print max-w-3xl mx-auto px-5 pb-3 text-sm text-amber-700">This price was valid until the date shown. Please ask {q.caterer.name} to confirm it is still available.</p>}
      {state === "DECLINED" && <p className="no-print max-w-3xl mx-auto px-5 pb-3 text-sm text-zinc-500">This quotation is no longer open.</p>}
      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none">
        <CatererInvoice party={doc.party} bills={doc.bills} quote={doc.info} />
      </div>
    </div>
  );
}
