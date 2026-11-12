import { UrlPagination } from "@/components/url-pagination";
import { paginate } from "@/lib/paging";

export type ReportPaging = { query: Record<string, string>; page: number; pageSize: number };

// Pages one long report table; the rest of the report (totals, charts) still covers every row.
export function pageOf<T>(rows: T[], pg: ReportPaging) {
  return paginate(rows, { page: pg.page, pageSize: pg.pageSize });
}

export function ReportPager({ pg, paged }: { pg: ReportPaging; paged: { page: number; totalPages: number; total: number; pageSize: number } }) {
  if (paged.total <= 25) return null;
  return (
    <div className="mt-3 -mx-5 -mb-5 border-t border-zinc-100 dark:border-zinc-800">
      <UrlPagination basePath="/caterer/reports" query={pg.query} defaultSize={25} page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={paged.pageSize} />
    </div>
  );
}
