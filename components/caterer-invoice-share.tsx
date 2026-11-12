"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { billMessage, orderMessage, whatsappLink } from "@/lib/caterer-share";
import type { BillTypeKey } from "@/lib/caterer-orders";
import { cn } from "@/lib/utils";
import { Show } from "@/components/access-context";

type BillInfo = { number: number; type: BillTypeKey; shareToken: string; subtotalPaise: number; discountPaise: number; taxPaise: number; receivedPaise: number };

// Switch between the food bill, the service bill and both together, and send the one on screen on WhatsApp.
export function CatererInvoiceShare({ orderId, orderToken, orderDate, customer, catererName, bills, selected }: {
  orderId: string; orderToken: string; orderDate: string; customer: { name: string; phone: string }; catererName: string;
  bills: BillInfo[]; selected: "ALL" | BillTypeKey;
}) {
  const options: { key: "ALL" | BillTypeKey; label: string }[] = [
    ...(bills.length > 1 ? [{ key: "ALL" as const, label: "Both together" }] : []),
    ...bills.map((b) => ({ key: b.type, label: b.type === "FOOD" ? "Food bill" : "Service & Settings bill" })),
  ];

  const send = () => {
    const origin = window.location.origin;
    const one = selected !== "ALL" ? bills.find((b) => b.type === selected) : undefined;
    const text = one
      ? billMessage({ catererName, customerName: customer.name, number: one.number, type: one.type, date: orderDate, bill: one, url: `${origin}/b/${one.shareToken}` })
      : orderMessage({ catererName, customerName: customer.name, date: orderDate, bills, url: `${origin}/o/${orderToken}` });
    window.open(whatsappLink(customer.phone, text), "_blank", "noopener");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.length > 1 && (
        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
          {options.map((o) => (
            <Link key={o.key} href={`/caterer/orders/${orderId}/invoice?bill=${o.key}`} replace
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors", selected === o.key ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
              {o.label}
            </Link>
          ))}
        </div>
      )}
      <Show what="phones"><button type="button" onClick={send} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
        <MessageCircle className="h-4 w-4" /> Send on WhatsApp
      </button></Show>
    </div>
  );
}
