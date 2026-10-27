"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => { open(): void };
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: { razorpay_payment_id: string }) => void;
  prefill?: { contact?: string };
  theme?: { color?: string };
};

type Props = { bookingId: string; amountPaise: number };

export function RazorpayCheckout({ bookingId, amountPaise }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  async function pollUntilConfirmed() {
    setPolling(true);
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) break;
      const { booking } = await res.json();
      if (booking.status === "CONFIRMED") {
        router.refresh();
        return;
      }
    }
    // Webhook may be delayed — refresh anyway so the UI reflects latest state
    router.refresh();
  }

  async function startPayment() {
    setError("");
    setLoading(true);

    const res = await fetch(`/api/bookings/${bookingId}/payment`, { method: "POST" });
    if (!res.ok) {
      setLoading(false);
      setError("Could not create payment order. Please try again.");
      return;
    }

    const { orderId, amountPaise: amount } = await res.json();
    setLoading(false);

    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
      amount,
      currency: "INR",
      order_id: orderId,
      name: "Virunnu",
      description: "Hall booking",
      handler() {
        pollUntilConfirmed();
      },
      theme: { color: "#f59e0b" },
    });

    rzp.open();
  }

  if (polling) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5 text-center space-y-2">
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Confirming your payment…</p>
        <p className="text-xs text-amber-600 dark:text-amber-400">This usually takes a few seconds.</p>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setReady(true)}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={startPayment}
        disabled={loading || !ready}
        className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Preparing payment…" : `Pay ₹${(amountPaise / 100).toLocaleString("en-IN")}`}
      </button>
      <p className="text-xs text-center text-zinc-400">
        Secured by Razorpay · test mode — no real charges
      </p>
    </>
  );
}
