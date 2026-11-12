"use client";

import { cn } from "@/lib/utils";

export const addonLine = (unit: string, unitPaise: number, qty: number) => (unit === "HOUR" ? Math.round(unitPaise * qty) : unitPaise);

// One add-on row: tick to include, and for hourly add-ons choose the hours.
export function AddonRow({ name, unit, unitPaise, qty, on, sign, onToggle, onQty }: {
  name: string; unit: string; unitPaise: number; qty: number; on: boolean; sign?: string;
  onToggle: () => void; onQty: (n: number) => void;
}) {
  const hourly = unit === "HOUR";
  return (
    <div className={cn(
      "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition-colors",
      on ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-zinc-200 dark:border-zinc-700"
    )}>
      <label className="flex items-center gap-2 cursor-pointer min-w-0">
        <input type="checkbox" checked={on} onChange={onToggle} className="h-4 w-4 accent-amber-500 shrink-0" />
        <span className={cn("truncate", !on && sign === "" && "line-through opacity-60")}>{name}</span>
      </label>
      <div className="flex items-center gap-2 shrink-0 text-zinc-500">
        {hourly && on && (
          <span className="inline-flex items-center gap-1">
            <input
              type="number" min={0.5} max={48} step={0.5} value={qty}
              onChange={(e) => onQty(Math.min(48, Math.max(0.5, parseFloat(e.target.value) || 1)))}
              className="w-14 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
              aria-label={`Hours of ${name}`}
            />
            <span className="text-xs">hr</span>
          </span>
        )}
        <span>{sign ?? ""}₹{(addonLine(unit, unitPaise, on ? qty : 1) / 100).toLocaleString("en-IN")}{hourly && !on ? " /hr" : ""}</span>
      </div>
    </div>
  );
}
