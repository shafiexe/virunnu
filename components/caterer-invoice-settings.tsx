"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";

export function CatererInvoiceSettings({ initial }: { initial: { nextInvoiceNumber: number; lastUsed: number; upiId: string | null; bankDetails: string | null; invoiceNote: string | null; gstEnabled: boolean; gstin: string | null; foodGstPercent: number; serviceGstPercent: number; gstInclusive: boolean } }) {
  const router = useRouter();
  const [next, setNext] = useState(String(initial.nextInvoiceNumber));
  const [upi, setUpi] = useState(initial.upiId ?? "");
  const [bank, setBank] = useState(initial.bankDetails ?? "");
  const [note, setNote] = useState(initial.invoiceNote ?? "");
  const [gstOn, setGstOn] = useState(initial.gstEnabled);
  const [gstin, setGstin] = useState(initial.gstin ?? "");
  const [foodRate, setFoodRate] = useState(String(initial.foodGstPercent));
  const [serviceRate, setServiceRate] = useState(String(initial.serviceGstPercent));
  const [inclusive, setInclusive] = useState(initial.gstInclusive);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/caterer/invoice-settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextInvoiceNumber: Number(next), upiId: upi, bankDetails: bank, invoiceNote: note, gstEnabled: gstOn, gstin, foodGstPercent: Number(foodRate) || 0, serviceGstPercent: Number(serviceRate) || 0, gstInclusive: inclusive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      setSaved(true); router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Invoice settings</h2>
        <p className="text-xs text-zinc-500 mt-0.5">What your invoices carry. Food and service bills share one running number.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-zinc-500">Next invoice number</span>
          <input className={INPUT} inputMode="numeric" value={next} onChange={(e) => { setNext(e.target.value.replace(/\D/g, "")); setSaved(false); }} />
          <span className="block text-[11px] text-zinc-400">{initial.lastUsed > 0 ? `Last invoice issued: ${initial.lastUsed}.` : "No invoice issued yet, so you can start from any number, for example where Vyapar left off."}</span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-zinc-500">UPI ID (printed for payments)</span>
          <input className={INPUT} placeholder="e.g. kahani@upi" value={upi} onChange={(e) => { setUpi(e.target.value); setSaved(false); }} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-zinc-500">Bank details (optional)</span>
        <textarea className={`${INPUT} resize-none`} rows={2} placeholder="Account name, number, IFSC" value={bank} onChange={(e) => { setBank(e.target.value); setSaved(false); }} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-zinc-500">Note at the bottom of every invoice (optional)</span>
        <textarea className={`${INPUT} resize-none`} rows={2} placeholder="e.g. Thank you for choosing us. Balance to be paid within 7 days." value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} />
      </label>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-amber-500" checked={gstOn} onChange={(e) => { setGstOn(e.target.checked); setSaved(false); }} />
          <span>
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">I am registered for GST</span>
            <span className="block text-xs text-zinc-500">New invoices become Tax Invoices with your GSTIN and a CGST / SGST breakup. Invoices already made stay as they are.</span>
          </span>
        </label>
        {gstOn && (
          <div className="space-y-3 pl-7">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-500">Your GSTIN</span>
              <input className={`${INPUT} uppercase`} placeholder="32ABCDE1234F1Z5" maxLength={15} value={gstin} onChange={(e) => { setGstin(e.target.value.toUpperCase()); setSaved(false); }} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-500">GST on Food bills (%)</span>
                <input className={INPUT} inputMode="decimal" value={foodRate} onChange={(e) => { setFoodRate(e.target.value.replace(/[^\d.]/g, "")); setSaved(false); }} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-zinc-500">GST on Service &amp; Settings (%)</span>
                <input className={INPUT} inputMode="decimal" value={serviceRate} onChange={(e) => { setServiceRate(e.target.value.replace(/[^\d.]/g, "")); setSaved(false); }} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([[true, "Prices include GST", "The total stays the same; the invoice shows how much of it is GST."], [false, "Add GST on top", "GST is added to the total at the end of the invoice."]] as const).map(([v, t, d]) => (
                <button key={String(v)} type="button" onClick={() => { setInclusive(v); setSaved(false); }} className={`rounded-xl border p-3 text-left ${inclusive === v ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : "border-zinc-200 dark:border-zinc-700"}`}>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">{t}</span>
                  <span className="block text-[11px] text-zinc-500 mt-0.5">{d}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-400">Common rates: 5% for catering, 18% for service and equipment hire. Check with your accountant.</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}{saved ? "Saved" : "Save invoice settings"}
      </button>
    </section>
  );
}
