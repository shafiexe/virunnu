"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IndianRupee, Loader2 } from "lucide-react";

export function AdvancePaymentForm({
  bookingId,
  totalPaise,
}: {
  bookingId: string;
  totalPaise: number;
}) {
  const router = useRouter();
  const [advanceRupees, setAdvanceRupees] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalRupees = totalPaise / 100;
  const advanceNum = parseInt(advanceRupees) || 0;
  const remainingRupees = totalRupees - advanceNum;

  const isValid = advanceNum >= 1000 && advanceNum < totalRupees;

  async function payAdvance() {
    if (!isValid) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payment/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advancePaise: advanceNum * 100 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">Pay advance</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Enter any amount ≥ ₹1,000. Pay the rest before your event.
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Advance amount (₹)
        </label>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="number"
            min={1000}
            max={totalRupees - 1}
            step={100}
            value={advanceRupees}
            onChange={(e) => setAdvanceRupees(e.target.value)}
            placeholder="e.g. 10000"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {advanceNum > 0 && isValid && (
          <div className="flex justify-between text-xs pt-1">
            <span className="text-zinc-500">Remaining to pay later</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              ₹{remainingRupees.toLocaleString("en-IN")}
            </span>
          </div>
        )}
        {advanceNum > 0 && advanceNum < 1000 && (
          <p className="text-xs text-red-500">Minimum advance is ₹1,000</p>
        )}
        {advanceNum >= totalRupees && (
          <p className="text-xs text-amber-600">That covers the full amount — use the full payment button below</p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={payAdvance}
        disabled={!isValid || loading}
        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading
          ? "Processing…"
          : isValid
          ? `Confirm advance ₹${advanceNum.toLocaleString("en-IN")}`
          : "Enter advance amount"}
      </button>
    </div>
  );
}

export function RemainingPaymentSection({
  bookingId,
  totalPaise,
  advancePaise,
}: {
  bookingId: string;
  totalPaise: number;
  advancePaise: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const remainingPaise = totalPaise - advancePaise;

  async function payRemaining() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payment/remaining`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">Payment summary</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Total amount</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            ₹{(totalPaise / 100).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-emerald-600 dark:text-emerald-400">Advance paid</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            − ₹{(advancePaise / 100).toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex justify-between border-t border-amber-200 dark:border-amber-900/50 pt-2 font-bold text-base">
          <span className="text-zinc-900 dark:text-zinc-50">Remaining due</span>
          <span className="text-amber-600 dark:text-amber-400">
            ₹{(remainingPaise / 100).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {process.env.NODE_ENV === "development" ? (
        <button
          onClick={payRemaining}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Processing…" : `✓ Confirm remaining payment ₹${(remainingPaise / 100).toLocaleString("en-IN")}`}
        </button>
      ) : null}
    </div>
  );
}
