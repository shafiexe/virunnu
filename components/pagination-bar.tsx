"use client";

import { PAGE_SIZES } from "@/hooks/use-paginated";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (ps: number) => void;
};

const SHOW_THRESHOLD = 25;

export function PaginationBar({ page, totalPages, total, pageSize, onPage, onPageSize }: Props) {
  if (total <= SHOW_THRESHOLD) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
      {/* Left: count + page size */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">
          {from}–{to} of {total.toLocaleString("en-IN")}
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} / page</option>
          ))}
        </select>
      </div>

      {/* Right: nav buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => onPage(1)} disabled={page === 1} title="First page">
            <ChevronsLeft className="h-3.5 w-3.5" />
          </NavBtn>
          <NavBtn onClick={() => onPage(page - 1)} disabled={page === 1} title="Previous page">
            <ChevronLeft className="h-3.5 w-3.5" />
          </NavBtn>
          <span className="px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium select-none">
            {page} / {totalPages}
          </span>
          <NavBtn onClick={() => onPage(page + 1)} disabled={page >= totalPages} title="Next page">
            <ChevronRight className="h-3.5 w-3.5" />
          </NavBtn>
          <NavBtn onClick={() => onPage(totalPages)} disabled={page >= totalPages} title="Last page">
            <ChevronsRight className="h-3.5 w-3.5" />
          </NavBtn>
        </div>
      )}
    </div>
  );
}

function NavBtn({ onClick, disabled, title, children }: { onClick: () => void; disabled: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
