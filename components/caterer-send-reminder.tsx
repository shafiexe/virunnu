"use client";

import { BellRing } from "lucide-react";
import { getActiveBusiness } from "@/lib/caterer-templates";
import { reminderMessage, whatsappLink } from "@/lib/caterer-share";
import { useUndoable } from "@/components/undo-toast";
import { cn } from "@/lib/utils";

// "Send reminder": opens WhatsApp with the payment-reminder message already written, and notes that this customer was just reminded.
export function SendReminder({ customerId, customerName, phone, balancePaise, invoices, date, path, compact = false, label = "Remind", className }: {
  customerId: string; customerName: string; phone: string; balancePaise: number;
  /** reads like "Invoice 12", "Invoices 12, 13" or "your account" */
  invoices: string; date: string; path: string; compact?: boolean; label?: string; className?: string;
}) {
  const { notify } = useUndoable();
  function send() {
    const biz = getActiveBusiness();
    const text = reminderMessage({ catererName: biz.name, customerName, balancePaise, invoices, date, upiId: biz.upiId, url: `${window.location.origin}${path}` });
    window.open(whatsappLink(phone, text), "_blank", "noopener");
    fetch(`/api/caterer/customers/${customerId}/reminded`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", keepalive: true }).catch(() => {});
    notify(`Reminder for ${customerName} opened in WhatsApp`);
  }
  return (
    <button type="button" onClick={send} title={`Send ${customerName} a payment reminder on WhatsApp`}
      className={cn("inline-flex items-center gap-1 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors",
        compact ? "px-2.5 py-1.5 md:px-2 md:py-0.5 text-xs md:text-[11px]" : "px-3 py-1.5 text-xs", className)}>
      <BellRing className="h-3 w-3" /> {label}
    </button>
  );
}
