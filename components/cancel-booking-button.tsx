"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  async function cancel() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Could not cancel. Please try again.");
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 space-y-3">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Cancel this booking? The slot will be released.
        </p>
        <textarea
          rows={2}
          placeholder="Reason for cancellation (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 text-zinc-800 dark:text-zinc-200"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={cancel}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button
            onClick={() => { setConfirming(false); setReason(""); }}
            className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Keep booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm text-zinc-400 hover:text-red-500 transition-colors underline underline-offset-2"
    >
      Cancel booking
    </button>
  );
}
