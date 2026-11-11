"use client";

import { useRouter } from "next/navigation";
import { PaginationBar } from "@/components/pagination-bar";

// The same page bar the convention-centre tables use, driven by the page address so the page number,
// the page size and any filters survive a reload or a shared link.
export function UrlPagination({ basePath, query, page, totalPages, total, pageSize, defaultSize = 50 }: {
  basePath: string; query: Record<string, string>; page: number; totalPages: number; total: number; pageSize: number; defaultSize?: number;
}) {
  const router = useRouter();
  const go = (next: { page?: number; pageSize?: number }) => {
    const p = new URLSearchParams(query);
    const size = next.pageSize ?? pageSize;
    if (size !== defaultSize) p.set("pageSize", String(size));
    const pg = next.page ?? 1;
    if (pg > 1) p.set("page", String(pg));
    const qs = p.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };
  return <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={(n) => go({ page: n })} onPageSize={(n) => go({ pageSize: n })} />;
}
