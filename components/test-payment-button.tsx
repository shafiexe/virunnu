"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TestPaymentButton({ bookingId, amountPaise }: { bookingId: string; amountPaise: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setError("");
    setLoading(true);
    const res = await fetch(`/api/bookings/${bookingId}/payment/test-confirm`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      setError("Something went wrong. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
          Test mode
        </span>
        <span className="text-xs text-zinc-500">No real payment will be charged</span>
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Simulate payment</div>
        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
          ₹{(amountPaise / 100).toLocaleString("en-IN")}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Confirming…
          </>
        ) : (
          "✓ Confirm test payment"
        )}
      </button>
    </div>
  );
}
