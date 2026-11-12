"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileDown, Loader2, MessageCircle, Pencil, RotateCcw, Trash2, X, XCircle } from "lucide-react";
import { useUndoable } from "@/components/undo-toast";
import { quoteMessage, whatsappLink } from "@/lib/caterer-share";
import { cn } from "@/lib/utils";
import { WriteOnly, Show } from "@/components/access-context";

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400";

type Props = {
  id: string; token: string; state: "OPEN" | "EXPIRED" | "ACCEPTED" | "DECLINED"; orderId: string | null;
  catererName: string; customer: { name: string; phone: string }; label: string; date: string; totalPaise: number; validUntil: string | null;
  defaultDate: string;
};

// What can be done with a quotation: send it, get it as a PDF, change it, and above all turn it into an order when the customer says yes.
export function CatererQuoteActions(p: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [date, setDate] = useState(p.defaultDate);
  const [advance, setAdvance] = useState("");
  const [method, setMethod] = useState("CASH");
  const { undoable } = useUndoable();
  const [deleting, setDeleting] = useState(false);

  const send = () => {
    const text = quoteMessage({ catererName: p.catererName, customerName: p.customer.name, label: p.label, date: p.date, totalPaise: p.totalPaise, validUntil: p.validUntil ? new Date(p.validUntil) : null, url: `${window.location.origin}/q/${p.token}` });
    window.open(whatsappLink(p.customer.phone, text), "_blank", "noopener");
  };

  async function call(key: string, url: string, method: string, body?: object) {
    setBusy(key); setError("");
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return null; }
      return data;
    } finally { setBusy(""); }
  }

  async function convert() {
    const data = await call("convert", `/api/caterer/quotes/${p.id}/convert`, "POST", { date, ...(Number(advance) > 0 ? { advance: Number(advance), advanceMethod: method } : {}) });
    if (data?.orderId) { router.push(`/caterer/orders/${data.orderId}`); router.refresh(); }
  }

  const btn = "inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {p.state === "ACCEPTED" && p.orderId ? (
          <Link href={`/caterer/orders/${p.orderId}`} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><CheckCircle2 className="h-4 w-4" /> Accepted · open the order</Link>
        ) : (
          <WriteOnly page="orders"><button type="button" onClick={() => { setError(""); setConfirming(true); }} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><CheckCircle2 className="h-4 w-4" /> Customer accepted · make order</button></WriteOnly>
        )}
        <Show what="phones"><button type="button" onClick={send} className={cn(btn, "text-emerald-700 dark:text-emerald-400")}><MessageCircle className="h-4 w-4" /> WhatsApp</button></Show>
        <a href={`/api/caterer/quotes/${p.id}/pdf`} download className={cn(btn, "text-amber-600 dark:text-amber-400")}><FileDown className="h-4 w-4" /> PDF</a>
        <WriteOnly page="orders">{p.state !== "ACCEPTED" && <Link href={`/caterer/quotes/${p.id}/edit`} className={btn}><Pencil className="h-4 w-4" /> Edit</Link>}</WriteOnly>
        <WriteOnly page="orders">{p.state === "DECLINED" && <button type="button" disabled={!!busy} onClick={async () => { if (await call("reopen", `/api/caterer/quotes/${p.id}`, "PATCH", { status: "OPEN" })) router.refresh(); }} className={btn}><RotateCcw className="h-4 w-4" /> Reopen</button>}</WriteOnly>
        <WriteOnly page="orders">{(p.state === "OPEN" || p.state === "EXPIRED") && <button type="button" disabled={!!busy} onClick={async () => { if (await call("decline", `/api/caterer/quotes/${p.id}`, "PATCH", { status: "DECLINED" })) router.refresh(); }} className={btn}><XCircle className="h-4 w-4" /> Declined</button>}</WriteOnly>
        <WriteOnly page="orders">
        {p.state !== "ACCEPTED" && (
          <button type="button" disabled={deleting} onClick={() => {
            const here = window.location.pathname;
            undoable("Quotation deleted", {
              request: { url: `/api/caterer/quotes/${p.id}`, method: "DELETE" },
              onStart: () => setDeleting(true), onUndo: () => setDeleting(false),
              onDone: () => { if (window.location.pathname === here) router.push("/caterer/quotes"); },
            });
          }} className={cn(btn, "text-red-600")}><Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete"}</button>
        )}
        </WriteOnly>
      </div>
      {error && !confirming && <p className="text-sm text-red-500">{error}</p>}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setConfirming(false)}>
          <form className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); convert(); }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Make this an order</h3>
                <p className="text-xs text-zinc-500">The items, times and discounts come across. The invoices are created now.</p>
              </div>
              <button type="button" onClick={() => setConfirming(false)} aria-label="Close"><X className="h-4 w-4 text-zinc-400" /></button>
            </div>
            <label className="block space-y-1"><span className="text-xs font-medium text-zinc-500">Function date</span><input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1"><span className="text-xs font-medium text-zinc-500">Advance received (₹)</span><input className={INPUT} inputMode="decimal" placeholder="optional" value={advance} onChange={(e) => setAdvance(e.target.value.replace(/[^\d.]/g, ""))} /></label>
              <label className="block space-y-1"><span className="text-xs font-medium text-zinc-500">Paid by</span>
                <select className={INPUT} value={method} onChange={(e) => setMethod(e.target.value)}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK">Bank</option></select>
              </label>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={busy === "convert"} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy === "convert" && <Loader2 className="h-4 w-4 animate-spin" />} Create order
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
