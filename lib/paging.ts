export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];

// Reads ?page and ?pageSize from the address, with safe defaults.
export function parsePaging(sp: { page?: string; pageSize?: string }, defaultSize = 50) {
  const size = parseInt(sp.pageSize ?? "");
  return {
    page: Math.max(1, parseInt(sp.page ?? "") || 1),
    pageSize: PAGE_SIZE_OPTIONS.includes(size) ? size : defaultSize,
  };
}

// One page of a list that is already in memory.
export function paginate<T>(rows: T[], paging: { page: number; pageSize: number }) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / paging.pageSize));
  const page = Math.min(paging.page, totalPages);
  return { rows: rows.slice((page - 1) * paging.pageSize, page * paging.pageSize), total, totalPages, page, pageSize: paging.pageSize };
}

// The rest of the address (month, filters …) so changing page keeps everything else.
export const queryOf = (sp: Record<string, string | undefined>, drop: string[] = ["page", "pageSize"]) =>
  Object.fromEntries(Object.entries(sp).filter(([k, v]) => v !== undefined && v !== "" && !drop.includes(k))) as Record<string, string>;
