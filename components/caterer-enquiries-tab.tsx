"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Calendar, Users, MessageSquare, CheckCircle, XCircle, Clock, ClipboardPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/pagination-bar";

type Enquiry = {
  id: string;
  name: string;
  phone: string;
  eventDate: string | null;
  guestCount: number | null;
  message: string | null;
  status: "PENDING" | "ATTENDED" | "IGNORED";
  createdAt: string;
};

export function CatererEnquiriesTab({ initialEnquiries }: { initialEnquiries: Enquiry[] }) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [actingId, setActingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "ATTENDED" | "IGNORED">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  async function updateStatus(id: string, status: "ATTENDED" | "IGNORED") {
    if (actingId) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/caterer/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setEnquiries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
      }
    } finally {
      setActingId(null);
    }
  }

  const filtered = filter === "ALL" ? enquiries : enquiries.filter((e) => e.status === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize);
  const pendingCount = enquiries.filter((e) => e.status === "PENDING").length;

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
        {(["ALL", "PENDING", "ATTENDED", "IGNORED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap",
              filter === f
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            {f === "ALL" ? `All (${enquiries.length})` : f === "PENDING" ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <Clock className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">
            {filter === "ALL" ? "No enquiries yet. They appear here when customers contact you from your public page." : `No ${filter.toLowerCase()} enquiries.`}
          </p>
          {filter === "ALL" && <a href="/caterer/profile" className="mt-3 inline-flex rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white">Complete your public profile</a>}
        </div>
      )}

      <div className="space-y-2">
        {shown.map((e) => {
          const dateStr = e.eventDate
            ? new Date(e.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : null;
          const receivedStr = new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

          return (
            <div
              key={e.id}
              className={cn(
                "rounded-2xl border bg-white dark:bg-zinc-900 p-4 space-y-3",
                e.status === "PENDING"
                  ? "border-amber-200 dark:border-amber-800/50"
                  : e.status === "IGNORED"
                  ? "border-zinc-100 dark:border-zinc-800 opacity-60"
                  : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">{e.name}</span>
                    {e.status === "PENDING" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">NEW</span>
                    )}
                    {e.status === "ATTENDED" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">ATTENDED</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400">Received {receivedStr}</div>
                </div>

                {e.status === "PENDING" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateStatus(e.id, "ATTENDED")}
                      disabled={actingId === e.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Attend
                    </button>
                    <button
                      onClick={() => updateStatus(e.id, "IGNORED")}
                      disabled={actingId === e.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-zinc-600 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Ignore
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                <a href={`tel:${e.phone}`} className="flex items-center gap-1 text-amber-600 hover:underline font-medium">
                  <Phone className="h-3 w-3" /> {e.phone}
                </a>
                {dateStr && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {dateStr}
                  </span>
                )}
                {e.guestCount && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {e.guestCount} guests
                  </span>
                )}
              </div>

              {e.status !== "IGNORED" && (
                <Link
                  href={`/caterer/orders/new?enquiry=${e.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-white transition-colors"
                >
                  <ClipboardPlus className="h-3.5 w-3.5" /> Create order
                </Link>
              )}

              {e.message && (
                <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-400" />
                  <span>{e.message}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden empty:hidden">
        <PaginationBar page={Math.min(page, totalPages)} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </div>
    </div>
  );
}
