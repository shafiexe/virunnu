"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function ApproveVenueButton({ venueId }: { venueId: string }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Approved — live on homepage
      </span>
    );
  }

  async function approve() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/venues/${venueId}/approve`, { method: "POST" });
      if (res.ok) {
        setDone(true);
        startTransition(() => router.refresh());
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={approve}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
    >
      <CheckCircle2 className="h-4 w-4" />
      {loading ? "Approving…" : "Approve & publish venue"}
    </button>
  );
}
