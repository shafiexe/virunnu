"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, MessageCircle, Percent, Trash2, Wallet, X } from "lucide-react";
import { BILL_LABEL, billMoney, rs as rsPaise, STATE_LABEL, type BillTypeKey } from "@/lib/caterer-orders";
import { billMessage, whatsappLink } from "@/lib/caterer-share";
import { useUndoable } from "@/components/undo-toast";
import { cn } from "@/lib/utils";
import { WriteOnly, Show } from "@/components/access-context";

export type BillCardData = {
  id: string; type: BillTypeKey; number: number; shareToken: string; createdAt: string;
  subtotalPaise: number; discountPaise: number; taxPaise: number; gstRateBp: number; gstInclusive: boolean; gstPaise: number; discountReason: string | null; receivedPaise: number;
  lines: { id: string; name: string; unit: string; quantity: number; ratePaise: number; amountPaise: number }[];
  payments: { id: string; amountPaise: number; method: string; note: string | null; paidOn: string; recordedBy?: string | null }[];
};

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
const STATE_STYLE = {
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  PARTLY: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  UNPAID: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
} as const;
const METHOD = { CASH: "Cash", UPI: "UPI", CARD: "Card", BANK: "Bank" } as Record<string, string>;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-4 w-4 text-zinc-400" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CatererBillCard({ bill, orderId, orderDate, customer, catererName, cancelled }: {
  bill: BillCardData; orderId: string; orderDate: string; customer: { name: string; phone: string }; catererName: string; cancelled: boolean;
}) {
  const router = useRouter();
  const { undoable } = useUndoable();
  const m = billMoney(bill);
  const [panel, setPanel] = useState<"pay" | "discount" | null>(null);
  const [amount, setAmount] = useState(String(m.balancePaise / 100));
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [discount, setDiscount] = useState(bill.discountPaise ? String(bill.discountPaise / 100) : "");
  const [reason, setReason] = useState(bill.discountReason ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(url: string, method: string, body?: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return false; }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  const share = () => {
    const url = `${window.location.origin}/b/${bill.shareToken}`;
    window.open(whatsappLink(customer.phone, billMessage({ catererName, customerName: customer.name, number: bill.number, type: bill.type, date: orderDate, bill, url })), "_blank", "noopener");
  };

  return (
    <section className={cn("rounded-2xl border bg-white dark:bg-zinc-900 p-5 space-y-4", cancelled ? "border-zinc-200 dark:border-zinc-800 opacity-60" : "border-zinc-200 dark:border-zinc-800")}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{BILL_LABEL[bill.type]}</div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Invoice #{bill.number}</h2>
        </div>
        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", STATE_STYLE[m.state])}>{STATE_LABEL[m.state]}</span>
      </div>

      <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 divide-y divide-zinc-200/70 dark:divide-zinc-700/60 text-sm">
        {bill.lines.map((l) => (
          <div key={l.id} className="flex items-start justify-between gap-3 px-3 py-2">
            <span className="text-zinc-700 dark:text-zinc-300 min-w-0">{l.name}<span className="block text-xs text-zinc-400">{l.quantity} {l.unit} × {rsPaise(l.ratePaise)}</span></span>
            <span className="shrink-0 text-zinc-900 dark:text-zinc-50">{rsPaise(l.amountPaise)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-zinc-500"><span>Sub total</span><span>{rsPaise(bill.subtotalPaise)}</span></div>
        {bill.discountPaise > 0 && <div className="flex justify-between text-amber-600 dark:text-amber-400"><span>Discount{bill.discountReason ? ` (${bill.discountReason})` : ""}</span><span>−{rsPaise(bill.discountPaise)}</span></div>}
        <div className="flex justify-between font-bold text-base text-zinc-900 dark:text-zinc-50 border-t border-zinc-200 dark:border-zinc-700 pt-1.5"><span>Total</span><span>{rsPaise(m.netPaise)}</span></div>
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Received</span><span>{rsPaise(bill.receivedPaise)}</span></div>
        <div className="flex justify-between font-semibold"><span>Balance</span><span className={m.balancePaise > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-400"}>{m.balancePaise > 0 ? rsPaise(m.balancePaise) : "Nil"}</span></div>
      </div>

      {bill.payments.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Payments received</div>
          {bill.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span>{new Date(p.paidOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })} · {METHOD[p.method] ?? p.method}{p.note ? ` · ${p.note}` : ""}{p.recordedBy ? ` · by ${p.recordedBy}` : ""}</span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{rsPaise(p.amountPaise)}</span>
                <WriteOnly page="orders"><button type="button" title="Undo this payment" aria-label="Undo this payment" disabled={busy} onClick={() => undoable(`Payment of ${rsPaise(p.amountPaise)} taken back`, {
                  request: { url: `/api/caterer/bills/${bill.id}/payments/${p.id}`, method: "DELETE" },
                  restore: { url: `/api/caterer/bills/${bill.id}/payments`, method: "POST", body: { amount: p.amountPaise / 100, method: p.method, note: p.note ?? undefined, paidOn: p.paidOn.slice(0, 10) } },
                })} className="p-1.5 -m-1.5 text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></WriteOnly>
              </span>
            </div>
          ))}
        </div>
      )}

      {!cancelled && (
        <div className="flex flex-wrap gap-2">
          <WriteOnly page="orders">
          {m.balancePaise > 0 && (
            <button type="button" onClick={() => { setAmount(String(m.balancePaise / 100)); setError(""); setPanel("pay"); }} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white">
              <Wallet className="h-4 w-4" /> Payment received
            </button>
          )}
          </WriteOnly>
          <WriteOnly page="orders">
          <button type="button" onClick={() => { setError(""); setPanel("discount"); }} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <Percent className="h-4 w-4" /> {bill.discountPaise > 0 ? "Edit discount" : "Discount"}
          </button>
          </WriteOnly>
          <Link href={`/caterer/orders/${orderId}/invoice?bill=${bill.type}`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20">
            <FileText className="h-4 w-4" /> Invoice
          </Link>
          <Show what="phones"><button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button></Show>
        </div>
      )}

      {panel === "pay" && (
        <Modal title={`Payment received · Invoice #${bill.number}`} onClose={() => setPanel(null)}>
          <p className="text-xs text-zinc-500">Balance on this invoice is {rsPaise(m.balancePaise)}. You can record part of it.</p>
          <div className="space-y-2">
            <input className={INPUT} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} aria-label="Amount received" />
            <select className={INPUT} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK">Bank transfer</option>
            </select>
            <input className={INPUT} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="button" disabled={busy} onClick={async () => { if (await call(`/api/caterer/bills/${bill.id}/payments`, "POST", { amount: Number(amount), method, note })) setPanel(null); }} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm payment received
          </button>
        </Modal>
      )}

      {panel === "discount" && (
        <Modal title={`Discount · Invoice #${bill.number}`} onClose={() => setPanel(null)}>
          <p className="text-xs text-zinc-500">Applies to this invoice only. Enter 0 to remove it.</p>
          <div className="space-y-2">
            <input className={INPUT} inputMode="decimal" placeholder="Discount (₹)" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ""))} />
            <input className={INPUT} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="button" disabled={busy} onClick={async () => { if (await call(`/api/caterer/bills/${bill.id}`, "PATCH", { discount: Number(discount) || 0, discountReason: reason })) setPanel(null); }} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save discount
          </button>
        </Modal>
      )}
    </section>
  );
}
