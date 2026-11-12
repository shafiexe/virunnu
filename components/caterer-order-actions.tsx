"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FileText, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { orderMessage, whatsappLink } from "@/lib/caterer-share";
import type { BillTypeKey } from "@/lib/caterer-orders";
import { useUndoable } from "@/components/undo-toast";
import { cn } from "@/lib/utils";
import { WriteOnly, Show } from "@/components/access-context";

const STATUS = [
  { key: "CONFIRMED", label: "Upcoming" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

export function CatererOrderActions({ orderId, status, shareToken, date, customer, catererName, bills }: {
  orderId: string; status: "CONFIRMED" | "COMPLETED" | "CANCELLED"; shareToken: string; date: string;
  customer: { name: string; phone: string }; catererName: string;
  bills: { number: number; type: BillTypeKey; subtotalPaise: number; discountPaise: number; taxPaise: number; receivedPaise: number }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { undoable } = useUndoable();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(next: string) {
    if (next === status) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/caterer/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "Could not update");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    const here = window.location.pathname;
    undoable("Order deleted", {
      request: { url: `/api/caterer/orders/${orderId}`, method: "DELETE" },
      onStart: () => setDeleting(true), onUndo: () => setDeleting(false),
      // only leave the page if the person is still on it
      onDone: () => { if (window.location.pathname === here) router.push("/caterer/orders"); },
    });
  }

  const shareAll = () => {
    const url = `${window.location.origin}/o/${shareToken}`;
    window.open(whatsappLink(customer.phone, orderMessage({ catererName, customerName: customer.name, date, bills, url })), "_blank", "noopener");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <WriteOnly page="orders">
        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
          {STATUS.map((s) => (
            <button key={s.key} type="button" disabled={busy} onClick={() => setStatus(s.key)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors", status === s.key ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>
              {s.label}
            </button>
          ))}
        </div>
        </WriteOnly>
        <WriteOnly page="orders"><Link href={`/caterer/orders/${orderId}/edit`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          <Pencil className="h-4 w-4" /> Edit order
        </Link></WriteOnly>
        <WriteOnly page="orders"><Link href={`/caterer/orders/new?copy=${orderId}`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          <Copy className="h-4 w-4" /> Copy to new order
        </Link></WriteOnly>
        {bills.length > 0 && status !== "CANCELLED" && (
          <>
            <Link href={`/caterer/orders/${orderId}/invoice`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20">
              <FileText className="h-4 w-4" /> {bills.length > 1 ? "Both invoices" : "Invoice"}
            </Link>
            <Show what="phones"><button type="button" onClick={shareAll} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
              <MessageCircle className="h-4 w-4" /> {bills.length > 1 ? "Share both" : "WhatsApp"}
            </button></Show>
          </>
        )}
        <span className="ml-auto" />
        <WriteOnly page="orders"><button type="button" onClick={remove} disabled={deleting} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-500 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting…" : "Delete"}</button></WriteOnly>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
