import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const shift = (value: string, delta: number) => {
  const [y, m] = value.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

// Previous / next month links; the month lives in the address so a view can be shared or bookmarked.
export function CatererMonthNav({ basePath, value, label, extra = "" }: { basePath: string; value: string; label: string; extra?: string }) {
  const href = (v: string) => `${basePath}?month=${v}${extra}`;
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1">
      <Link href={href(shift(value, -1))} aria-label="Previous month" className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"><ChevronLeft className="h-4 w-4" /></Link>
      <span className="min-w-28 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">{label}</span>
      <Link href={href(shift(value, 1))} aria-label="Next month" className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"><ChevronRight className="h-4 w-4" /></Link>
    </div>
  );
}
