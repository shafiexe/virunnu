"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Phone, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAllowed } from "@/components/access-context";

// One booked or held slot, as the table shows it
export type TableRow = {
  key: string;
  date: string;               // YYYY-MM-DD
  hallName: string;
  slotName: string;
  time: string;
  state: "CONFIRMED" | "ADVANCE_PAID" | "HELD" | "OTHER";
  name: string | null;
  phone: string | null;
  totalPaise: number | null;
  receivedPaise: number;
};

const rs = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const STATE_TEXT: Record<TableRow["state"], string> = { CONFIRMED: "Confirmed", ADVANCE_PAID: "Advance paid", HELD: "On hold", OTHER: "Booked" };
const STATE_STYLE: Record<TableRow["state"], string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  ADVANCE_PAID: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  HELD: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  OTHER: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
};
const dayLabel = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
const digitsOf = (p: string) => p.replace(/\D/g, "").slice(-10);

function PhoneCell({ phone }: { phone: string | null }) {
  const d = phone ? digitsOf(phone) : "";
  if (d.length < 10) return <span className="text-zinc-400">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <a href={`tel:+91${d}`} className="font-medium text-zinc-800 dark:text-zinc-100 hover:underline">{d}</a>
      <a href={`https://wa.me/91${d}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${d}`} title="Open in WhatsApp" className="text-[#25D366] hover:opacity-80"><MessageCircle className="h-4 w-4" /></a>
    </span>
  );
}

// The month's bookings as a table grouped by date: who booked which slot, their number and how much is due.
export function CalendarTable({ rows, monthLabel, loading, todayStr, onOpenDay }: { rows: TableRow[]; monthLabel: string; loading: boolean; todayStr: string; onOpenDay: (date: string) => void }) {
  const canSeePhones = useAllowed("phones");
  const [q, setQ] = useState("");
  const [state, setState] = useState<"ALL" | TableRow["state"]>("ALL");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return rows
      .filter((r) => state === "ALL" || r.state === state)
      .filter((r) => !needle || (r.name ?? "").toLowerCase().includes(needle) || (digits.length >= 3 && (r.phone ?? "").includes(digits)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [rows, q, state]);

  const groups = useMemo(() => {
    const m = new Map<string, TableRow[]>();
    for (const r of shown) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return [...m.entries()];
  }, [shown]);

  const total = shown.reduce((s, r) => s + (r.totalPaise ?? 0), 0);
  const due = shown.reduce((s, r) => s + Math.max(0, (r.totalPaise ?? 0) - r.receivedPaise), 0);
  const phoneOf = (r: TableRow) => (canSeePhones ? r.phone : null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" aria-label="Search bookings"
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </label>
        <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1" role="group" aria-label="Filter by status">
          {([["ALL", "All"], ["CONFIRMED", "Confirmed"], ["ADVANCE_PAID", "Advance paid"], ["HELD", "On hold"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setState(k)} aria-pressed={state === k}
              className={cn("px-3 py-2 md:py-1.5 rounded-lg text-xs font-semibold", state === k ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-300")}>{label}</button>
          ))}
        </div>
        <p className="ml-auto text-xs text-zinc-500" aria-live="polite">
          {shown.length} booking{shown.length === 1 ? "" : "s"}{total > 0 ? ` · ${rs(total)} total` : ""}{due > 0 ? ` · ${rs(due)} due` : ""}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-12 text-center">
          <p className="font-semibold text-zinc-800 dark:text-zinc-100">{loading ? "Loading…" : rows.length === 0 ? `No bookings in ${monthLabel}` : "No bookings match"}</p>
          {!loading && rows.length === 0 && <p className="mt-1 text-sm text-zinc-500">Use the arrows to look at another month, or add bookings from the calendar.</p>}
        </div>
      ) : (
        <>
          {/* Wide screens: a table with one band per date */}
          <div className="hidden md:block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-left text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Slot</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Name</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Phone</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-right">Amount</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold text-right">Due</th>
                </tr>
              </thead>
              {groups.map(([date, list]) => (
                <tbody key={date} className="border-t border-zinc-100 dark:border-zinc-800">
                  <tr className={cn("bg-zinc-50/70 dark:bg-zinc-800/30", date === todayStr && "bg-amber-50 dark:bg-amber-950/20")}>
                    <th scope="colgroup" colSpan={6} className="px-4 py-2 text-left">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">{dayLabel(date)}</span>
                      {date === todayStr && <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-zinc-900">Today</span>}
                      <button type="button" onClick={() => onOpenDay(date)} className="ml-3 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline">Open day</button>
                    </th>
                  </tr>
                  {list.map((r) => (
                    <tr key={r.key} className="border-t border-zinc-100 dark:border-zinc-800/70">
                      <td className="px-4 py-2.5"><div className="font-medium text-zinc-900 dark:text-zinc-50">{r.slotName}</div><div className="text-xs text-zinc-500">{r.time}{r.hallName ? ` · ${r.hallName}` : ""}</div></td>
                      <td className="px-4 py-2.5 text-zinc-800 dark:text-zinc-100">{r.name ?? <span className="text-zinc-400">—</span>}</td>
                      <td className="px-4 py-2.5"><PhoneCell phone={phoneOf(r)} /></td>
                      <td className="px-4 py-2.5"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATE_STYLE[r.state])}>{STATE_TEXT[r.state]}</span></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.totalPaise != null ? rs(r.totalPaise) : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.totalPaise != null && r.totalPaise - r.receivedPaise > 0 ? <span className="font-semibold text-rose-600 dark:text-rose-400">{rs(r.totalPaise - r.receivedPaise)}</span> : <span className="text-zinc-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          {/* Phones: one card per booking under each date */}
          <div className="md:hidden space-y-4">
            {groups.map(([date, list]) => (
              <section key={date} aria-label={dayLabel(date)} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{dayLabel(date)}{date === todayStr && <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-zinc-900">Today</span>}</h3>
                  <button type="button" onClick={() => onOpenDay(date)} className="text-xs font-medium text-amber-700 dark:text-amber-400">Open day</button>
                </div>
                {list.map((r) => (
                  <div key={r.key} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><div className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{r.name ?? "No name"}</div><div className="text-xs text-zinc-500">{r.slotName} · {r.time}</div></div>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATE_STYLE[r.state])}>{STATE_TEXT[r.state]}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-400" /><PhoneCell phone={phoneOf(r)} /></span>
                      <span className="tabular-nums text-zinc-700 dark:text-zinc-200">{r.totalPaise != null ? rs(r.totalPaise) : ""}{r.totalPaise != null && r.totalPaise - r.receivedPaise > 0 ? <span className="ml-2 font-semibold text-rose-600 dark:text-rose-400">{rs(r.totalPaise - r.receivedPaise)} due</span> : null}</span>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
