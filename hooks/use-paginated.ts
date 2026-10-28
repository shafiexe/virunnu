"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PagedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const PAGE_SIZES = [25, 50, 100, 200, 500] as const;
export const DEFAULT_PAGE_SIZE = 50;

type Options = {
  url: string;
  defaultPageSize?: number;
  extraParams?: Record<string, string>;
};

export function usePaginated<T>(opts: Options) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(opts.defaultPageSize ?? DEFAULT_PAGE_SIZE);
  const [search, setSearchState] = useState("");
  const [extraParams, setExtraParamsState] = useState<Record<string, string>>(opts.extraParams ?? {});

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cache = useRef(new Map<string, PagedResult<T>>());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cacheKey = (p: number, ps: number, s: string, ep: Record<string, string>) =>
    `${ps}::${s}::${JSON.stringify(ep)}::${p}`;

  const applyResult = (r: PagedResult<T>) => {
    setData(r.data);
    setTotal(r.total);
    setTotalPages(r.totalPages);
  };

  const silentPrefetch = useCallback((p: number, ps: number, s: string, ep: Record<string, string>) => {
    if (p < 1) return;
    const key = cacheKey(p, ps, s, ep);
    if (cache.current.has(key)) return;
    const params = new URLSearchParams({ page: String(p), pageSize: String(ps), search: s, ...ep });
    fetch(`${opts.url}?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((j: PagedResult<T> | null) => { if (j) cache.current.set(key, j); })
      .catch(() => {});
  }, [opts.url]);

  const doFetch = useCallback(async (p: number, ps: number, s: string, ep: Record<string, string>) => {
    const key = cacheKey(p, ps, s, ep);
    const cached = cache.current.get(key);
    if (cached) {
      applyResult(cached);
      silentPrefetch(p + 1, ps, s, ep);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(ps), search: s, ...ep });
      const res = await fetch(`${opts.url}?${params}`, { signal: ctrl.signal });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        setError(errData.error ?? `Error ${res.status}`);
        return;
      }
      const json: PagedResult<T> = await res.json();
      setError(null);
      cache.current.set(key, json);
      applyResult(json);
      silentPrefetch(p + 1, ps, s, ep);
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return;
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [opts.url, silentPrefetch]);

  // Single effect drives all fetches — React 18 batches state updates in callbacks.
  useEffect(() => {
    doFetch(page, pageSize, search, extraParams);
  }, [page, pageSize, search, extraParams, doFetch]);

  const goToPage = useCallback((p: number) => setPage(p), []);

  const changePageSize = useCallback((ps: number) => {
    cache.current.clear();
    setPageSizeState(ps);
    setPage(1);
  }, []);

  const onSearchChange = useCallback((raw: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      cache.current.clear();
      setSearchState(raw);
      setPage(1);
    }, 400);
  }, []);

  const changeExtraParams = useCallback((ep: Record<string, string>) => {
    cache.current.clear();
    setExtraParamsState(ep);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    // Drop the current page from cache so it re-fetches fresh data
    setPage((p) => {
      const key = cacheKey(p, pageSize, search, extraParams);
      cache.current.delete(key);
      return p;
    });
    setError(null);
    // Trigger re-fetch by bumping a counter via extraParams trick — just re-run doFetch directly
    doFetch(page, pageSize, search, extraParams);
  }, [page, pageSize, search, extraParams, doFetch]);

  return { data, total, totalPages, page, pageSize, loading, error, goToPage, changePageSize, onSearchChange, changeExtraParams, refresh };
}
