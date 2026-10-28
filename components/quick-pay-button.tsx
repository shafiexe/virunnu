"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type PayMethod = "CASH" | "UPI" | "CARD";

interface Props {
  bookingId: string;
  totalPaise: number;
  advancePaise?: number | null;
  onSuccess?: () => void;
}

export function QuickPayButton({ bookingId, totalPaise, advancePaise, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<PayMethod>("CASH");
  const [full, setFull] = useState(true);
  const [advRupees, setAdvRupees] = useState("");

  const remaining = advancePaise ? (totalPaise - advancePaise) / 100 : totalPaise / 100;

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const body: { advancePaise?: number; method: string } = {
        method: method === "CASH" ? "CASH" : "ONLINE",
      };
      if (!full) {
        const adv = Math.round(parseFloat(advRupees || "0") * 100);
        if (adv < 100000) { setError("Advance must be at least ₹1,000"); setLoading(false); return; }
        body.advancePaise = adv;
      }
      const res = await fetch(`/api/owner/bookings/${bookingId}/cash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setOpen(false);
      onSuccess?.();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(""); setFull(true); setAdvRupees(""); }}
        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
      >
        💰 Mark paid
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Record payment received</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Payment method */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">How was it paid?</p>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { key: "CASH" as const, icon: "💵", label: "Cash" },
                  { key: "UPI" as const, icon: "📱", label: "UPI / GPay" },
                  { key: "CARD" as const, icon: "💳", label: "Card" },
                ]).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-xs font-medium transition-colors",
                      method === m.key
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-amber-300"
                    )}
                  >
                    <span>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={full} onChange={() => setFull(true)} className="accent-amber-500" />
                <span>Full amount — ₹{remaining.toLocaleString("en-IN")}</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!full} onChange={() => setFull(false)} className="accent-amber-500" />
                <span>Advance only</span>
              </label>
              {!full && (
                <input
                  type="number" min={1000} step={100}
                  placeholder="Advance amount ₹"
                  value={advRupees}
                  onChange={(e) => setAdvRupees(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              )}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm payment received
            </button>
          </div>
        </div>
      )}
    </>
  );
}
