import Link from "next/link";
import { CalendarRange, Download } from "lucide-react";
import { presets, type ReportRange } from "@/lib/caterer-report-range";
import { cn } from "@/lib/utils";

// Start and end date for a report, with one-tap ranges. It is a plain form, so the range lives in the address
// and the same view can be bookmarked or shared.
export function CatererRangePicker({ tab, range, exportType }: { tab: string; range: ReportRange; exportType?: string }) {
  const list = presets();
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {list.map((p) => {
          const active = range.fromKey === p.from && range.toKey === p.to;
          return (
            <Link
              key={p.label}
              href={`/caterer/reports?tab=${tab}&from=${p.from}&to=${p.to}`}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", active ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      <form method="get" action="/caterer/reports" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="tab" value={tab} />
        <label className="space-y-1">
          <span className="block text-[11px] font-medium text-zinc-500">From</span>
          <input type="date" name="from" defaultValue={range.fromKey} required className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] font-medium text-zinc-500">To</span>
          <input type="date" name="to" defaultValue={range.toKey} required className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </label>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-white">
          <CalendarRange className="h-4 w-4" /> Show report
        </button>
        {exportType && (
          <a href={`/api/caterer/export?type=${exportType}&from=${range.fromKey}&to=${range.toKey}`} className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <Download className="h-4 w-4" /> Excel (CSV)
          </a>
        )}
      </form>
      <p className="text-xs text-zinc-400">Showing <span className="font-medium text-zinc-600 dark:text-zinc-300">{range.label}</span>. Functions are counted by their function date.</p>
    </div>
  );
}
