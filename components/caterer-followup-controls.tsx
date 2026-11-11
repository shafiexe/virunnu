"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellOff, Phone } from "lucide-react";
import { useUndoable } from "@/components/undo-toast";

const CHOICES = [3, 7, 14, 30];

// How long after a function a balance counts as "worth a call"
export function RemindAfterPicker({ value }: { value: number }) {
  const router = useRouter();
  const [days, setDays] = useState(value);
  async function pick(n: number) {
    setDays(n);
    await fetch("/api/caterer/message-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remindAfterDays: n }) });
    router.refresh();
  }
  return (
    <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
      Waiting more than
      <span className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
        {CHOICES.map((n) => (
          <button key={n} type="button" onClick={() => pick(n)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${days === n ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500"}`}>{n}</button>
        ))}
      </span>
      days after the function
    </div>
  );
}

export function CallLink({ phone }: { phone: string }) {
  return <a href={`tel:${phone}`} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 md:px-2 md:py-0.5 text-xs md:text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:border-amber-300"><Phone className="h-3 w-3" /> Call</a>;
}

// Put a customer off the list for a few days without having reminded them
export function SnoozeButton({ customerId, name }: { customerId: string; name: string }) {
  const { undoable } = useUndoable();
  return (
    <button type="button" title="Leave off the list for 3 days"
      onClick={() => undoable(`${name} snoozed for 3 days`, {
        request: { url: `/api/caterer/customers/${customerId}/reminded`, method: "POST", body: {} },
        restore: { url: `/api/caterer/customers/${customerId}/reminded`, method: "POST", body: { clear: true } },
      })}
      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 md:px-2 md:py-0.5 text-xs md:text-[11px] font-semibold text-zinc-500 hover:border-amber-300">
      <BellOff className="h-3 w-3" /> Snooze
    </button>
  );
}
