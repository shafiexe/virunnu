import { connection } from "next/server";
export const instant = false;
import { redirect, notFound } from "next/navigation";
import { getCatererForSession } from "@/lib/caterer-session";
import { loadQuote, quoteDoc, quoteState } from "@/lib/caterer-quotes";
import { orgLogoUrl } from "@/lib/org-logo";
import { CatererInvoice } from "@/components/caterer-invoice";
import { CatererQuoteActions } from "@/components/caterer-quote-actions";
import { BackToList } from "@/components/back-to-list";
import { cn } from "@/lib/utils";

const STATE_STYLE = {
  OPEN: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400",
  EXPIRED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  ACCEPTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  DECLINED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
} as const;
const STATE_LABEL = { OPEN: "Waiting for reply", EXPIRED: "Price expired", ACCEPTED: "Accepted", DECLINED: "Declined" } as const;

export default async function QuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const q = await loadQuote(ctx.caterer.id, (await params).quoteId);
  if (!q) notFound();
  const doc = quoteDoc(q, await orgLogoUrl(ctx.caterer.orgId));
  const state = quoteState(q);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <BackToList href="/caterer/quotes" label="Back to quotations" />
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Quotation {doc.info.label}</h1>
        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", STATE_STYLE[state])}>{STATE_LABEL[state]}</span>
      </div>
      <CatererQuoteActions
        id={q.id} token={q.shareToken} state={state} orderId={q.orderId} catererName={ctx.caterer.name}
        customer={{ name: q.customer.name, phone: q.customer.phone }} label={doc.info.label} date={q.date.toISOString()}
        totalPaise={doc.total} validUntil={q.validUntil?.toISOString() ?? null} defaultDate={q.date.toISOString().slice(0, 10)}
      />
      <div className="rounded-2xl bg-white shadow-sm border border-zinc-200">
        <CatererInvoice party={doc.party} bills={doc.bills} quote={doc.info} />
      </div>
    </div>
  );
}
