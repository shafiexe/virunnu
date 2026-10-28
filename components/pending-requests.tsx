"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Phone, User, IndianRupee, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type PendingBooking = {
  id: string;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  totalPaise: number;
  createdAt: string;
  hallSlot: {
    date: string;
    template: { name: string; startTime: string; endTime: string };
    hall: { name: string; venue: { name: string } };
  };
};


export function PendingRequests({ bookings: initial }: { bookings: PendingBooking[] }) {
  const [bookings, setBookings] = useState(initial);
  const [expanded, setExpanded] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function approve(bookingId: string) {
    if (actingId) return;
    setActingId(bookingId);
    try {
      const res = await fetch(`/api/owner/bookings/${bookingId}/approve`, { method: "POST" });
      if (res.ok) {
        setBookings((b) => b.filter((x) => x.id !== bookingId));
        startTransition(() => router.refresh());
      }
    } finally {
      setActingId(null);
    }
  }

  async function reject(bookingId: string) {
    if (actingId) return;
    setActingId(bookingId);
    try {
      const res = await fetch(`/api/owner/bookings/${bookingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      if (res.ok) {
        setRejecting(null);
        setRejectReason("");
        setBookings((b) => b.filter((x) => x.id !== bookingId));
        startTransition(() => router.refresh());
      }
    } finally {
      setActingId(null);
    }
  }

  if (bookings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Contact Requests</span>
          <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">{bookings.length}</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>

      {expanded && (
        <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
          {bookings.map((b) => {
            const slotDate = new Date(b.hallSlot.date + "T12:00:00").toLocaleDateString("en-IN", {
              weekday: "short", day: "numeric", month: "short", year: "numeric",
            });
            const isRejecting = rejecting === b.id;

            return (
              <div key={b.id} className="px-5 py-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {b.hallSlot.hall.name} — {b.hallSlot.template.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {slotDate} · {b.hallSlot.template.startTime}–{b.hallSlot.template.endTime}
                    </div>
                    <div className="text-xs text-zinc-400">{b.hallSlot.hall.venue.name}</div>
                  </div>
                  {b.guestPhone && (
                    <a
                      href={`https://wa.me/${b.guestPhone.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#1ebe5c] px-3 py-1.5 rounded-lg transition-colors shrink-0"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {b.guestName ?? "No name"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {b.guestPhone ?? "—"}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                    <IndianRupee className="h-3 w-3" />
                    {(b.totalPaise / 100).toLocaleString("en-IN")}
                  </span>
                  {b.guestEmail && <span className="text-zinc-400">{b.guestEmail}</span>}
                </div>

                {isRejecting ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="flex-1 min-w-0 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                    <button
                      onClick={() => reject(b.id)}
                      disabled={actingId === b.id}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                      {actingId === b.id ? "Rejecting…" : "Confirm reject"}
                    </button>
                    <button
                      onClick={() => { setRejecting(null); setRejectReason(""); }}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(b.id)}
                      disabled={!!actingId}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {actingId === b.id ? "Approving…" : "Approve"}
                    </button>
                    <button
                      onClick={() => setRejecting(b.id)}
                      disabled={!!actingId}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-60"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
