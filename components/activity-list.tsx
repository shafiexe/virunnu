import Link from "next/link";
import { History } from "lucide-react";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/empty-state";
import { UrlPagination } from "@/components/url-pagination";
import { parsePaging } from "@/lib/paging";
import { cn } from "@/lib/utils";

// What people on the team did, newest first, with a filter for one person. Shown to the main owner only.
export async function ActivityList({ orgId, basePath, sp }: { orgId: string; basePath: string; sp: { by?: string; page?: string; pageSize?: string } }) {
  const paging = parsePaging(sp, 50);
  const people = await db.activityLog.groupBy({ by: ["userId", "userName"], where: { orgId }, orderBy: { userName: "asc" } });
  const by = people.some((p) => p.userId === sp.by) ? sp.by : undefined;
  const where = { orgId, ...(by ? { userId: by } : {}) };
  const total = await db.activityLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / paging.pageSize));
  const page = Math.min(paging.page, totalPages);
  const rows = await db.activityLog.findMany({ where, orderBy: { at: "desc" }, skip: (page - 1) * paging.pageSize, take: paging.pageSize });

  const dayOf = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
  const days = [...new Set(rows.map((r) => dayOf(r.at)))];
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-xs font-medium", active ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300");

  return (
    <div className="space-y-4">
      {people.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Link href={basePath} className={chip(!by)}>Everyone</Link>
          {people.map((p) => <Link key={p.userId} href={`${basePath}?by=${p.userId}`} className={chip(by === p.userId)}>{p.userName}</Link>)}
        </div>
      )}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={History} title="Nothing yet" hint="Orders, payments, purchases, expenses and bookings that people on the team record or delete will be listed here." />
        ) : days.map((d) => (
          <div key={d}>
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">{d}</div>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.filter((r) => dayOf(r.at) === d).map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="w-16 shrink-0 pt-0.5 text-xs text-zinc-400">{r.at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
                  <span className="min-w-0 flex-1 text-sm text-zinc-800 dark:text-zinc-200"><span className="font-semibold">{r.userName}</span> · {r.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {total > 50 && <UrlPagination basePath={basePath} query={by ? { by } : {}} page={page} totalPages={totalPages} total={total} pageSize={paging.pageSize} />}
      </div>
    </div>
  );
}
