"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone, Search, Send, X } from "lucide-react";
import { WriteOnly, useCanWrite } from "@/components/access-context";
import { cn } from "@/lib/utils";

type Found = { id: string; name: string; city: string };
export type LinkedCaterer = { id: string; name: string; city: string; phone: string; whatsapp: string | null };
// PENDING: sent and not yet looked at; ATTENDED: they dealt with it (usually by making an order); IGNORED: set aside
export type SentState = { status: "PENDING" | "ATTENDED" | "IGNORED" } | null;

const SENT_TEXT = { PENDING: "Sent. Waiting for them to look at it.", ATTENDED: "They have dealt with it, usually by making an order.", IGNORED: "They set it aside. You can call them." } as const;

// Who is doing the food for this booking: link a caterer from Virunnu, then send them the booking so they can quote and make an order.
export function BookingCaterer({ bookingId, caterer, sent, closed, canShare }: { bookingId: string; caterer: LinkedCaterer | null; sent: SentState; closed: boolean; canShare: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const canWrite = useCanWrite("bookings");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the list when the search is emptied
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(() => { fetch(`/api/owner/caterers/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).then((d) => setFound(d.caterers ?? [])).catch(() => {}); }, 200);
    return () => clearTimeout(t);
  }, [q]);

  async function call(url: string, method: string, body?: object) {
    setBusy(true); setError("");
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Something went wrong"); return false; }
      router.refresh();
      return true;
    } finally { setBusy(false); }
  }

  if (!caterer) {
    if (closed || !canWrite) return <p className="text-sm text-zinc-500">No caterer linked.</p>;
    return (
      <>
        <div className="space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Is a caterer from Virunnu doing the food for this event? Link them, then send them the booking.</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a caterer by name or city" aria-label="Search a caterer"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          {found.length > 0 && (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              {found.map((c) => (
                <li key={c.id}>
                  <button type="button" disabled={busy} onClick={() => call(`/api/owner/bookings/${bookingId}/caterer`, "PATCH", { catererId: c.id })}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-amber-50 dark:hover:bg-amber-950/20">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{c.name}</span><span className="text-xs text-zinc-500">{c.city}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.trim().length >= 2 && found.length === 0 && <p className="text-xs text-zinc-400">No caterer found with that name.</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </>
    );
  }

  const wa = (caterer.whatsapp ?? caterer.phone).replace(/\D/g, "");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/caterers/${caterer.id}`} target="_blank" className="font-semibold text-zinc-900 dark:text-zinc-50 hover:text-amber-600">{caterer.name}</Link>
          <p className="text-xs text-zinc-500">{caterer.city}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${caterer.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"><Phone className="h-3.5 w-3.5" /> Call</a>
          <a href={`https://wa.me/${wa.length === 10 ? `91${wa}` : wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
          {!closed && !sent && (
            <WriteOnly page="bookings">
              <button type="button" disabled={busy} onClick={() => call(`/api/owner/bookings/${bookingId}/caterer`, "PATCH", { catererId: null })} aria-label="Remove this caterer" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-red-500"><X className="h-4 w-4" /></button>
            </WriteOnly>
          )}
        </div>
      </div>

      {sent ? (
        <p className={cn("rounded-xl px-3 py-2 text-sm", sent.status === "ATTENDED" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300" : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400")}>{SENT_TEXT[sent.status]}</p>
      ) : !closed && canShare && (
        <WriteOnly page="bookings">
          {!confirming ? (
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"><Send className="h-4 w-4" /> Send this booking to {caterer.name}</button>
          ) : (
            <div className="space-y-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/10 p-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">This sends {caterer.name} the event date, the hall and the <strong>customer&apos;s name and phone number</strong>. It appears in their Enquiries, where they can make an order.</p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={async () => { if (await call(`/api/owner/bookings/${bookingId}/caterer/send`, "POST")) setConfirming(false); }} className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white">{busy ? "Sending…" : "Send"}</button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">Cancel</button>
              </div>
            </div>
          )}
        </WriteOnly>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
