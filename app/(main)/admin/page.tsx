import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { CheckCircle, XCircle, Clock, Building2, UtensilsCrossed, Users, FileText } from "lucide-react";

export default async function AdminPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const [pendingVenues, approvedVenues, allCaterers, ownerOrgs, pendingOwnerApps, pendingCatererApps] = await Promise.all([
    db.venue.findMany({ where: { approved: false }, include: { org: true, halls: { select: { id: true } } }, orderBy: { createdAt: "desc" } }),
    db.venue.findMany({ where: { approved: true }, include: { org: true, halls: { select: { id: true } } }, orderBy: { createdAt: "desc" } }),
    db.caterer.findMany({ orderBy: { createdAt: "desc" } }),
    db.organization.count({ where: { type: "CONVENTION" } }),
    db.ownerApplication.count({ where: { status: "PENDING" } }),
    db.catererApplication.count({ where: { status: "PENDING" } }),
  ]);

  const pendingCaterers = allCaterers.filter((c) => !c.approved);
  const approvedCaterers = allCaterers.filter((c) => c.approved);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Admin Panel</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage venues, caterers and owners.</p>
      </div>

      {/* Quick-nav cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Link
          href="/admin/owners"
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-amber-300 dark:hover:border-amber-700 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-amber-600" />
          </div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-amber-600 transition-colors">Convention Owners</div>
          <div className="text-sm text-zinc-500 mt-0.5">{ownerOrgs} registered</div>
        </Link>
        <Link
          href="/admin/caterers"
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-amber-300 dark:hover:border-amber-700 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-3">
            <UtensilsCrossed className="h-5 w-5 text-orange-500" />
          </div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-amber-600 transition-colors">Caterers</div>
          <div className="text-sm text-zinc-500 mt-0.5">{approvedCaterers.length} live · {pendingCaterers.length} pending</div>
        </Link>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
            <Building2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-50">Venues</div>
          <div className="text-sm text-zinc-500 mt-0.5">{approvedVenues.length} live · {pendingVenues.length} pending</div>
        </div>
        <Link
          href="/admin/applications"
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-amber-300 dark:hover:border-amber-700 transition-colors group relative"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center mb-3">
            <FileText className="h-5 w-5 text-sky-600" />
          </div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-amber-600 transition-colors">Applications</div>
          <div className="text-sm text-zinc-500 mt-0.5">{pendingOwnerApps + pendingCatererApps} pending</div>
          {(pendingOwnerApps + pendingCatererApps) > 0 && (
            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingOwnerApps + pendingCatererApps}
            </span>
          )}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending venues", value: pendingVenues.length, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", icon: Clock },
          { label: "Live venues", value: approvedVenues.length, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: Building2 },
          { label: "Pending caterers", value: pendingCaterers.length, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", icon: Clock },
          { label: "Live caterers", value: approvedCaterers.length, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: UtensilsCrossed },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div>
              <div className="text-xs text-zinc-500">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending venues */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-amber-500" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Pending venues ({pendingVenues.length})</h2>
        </div>
        {pendingVenues.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-400">
            No pending venues.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingVenues.map((v) => (
              <div key={v.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">{v.name}</div>
                  <div className="text-sm text-zinc-500">{v.city}, {v.state} · {v.halls.length} hall{v.halls.length !== 1 ? "s" : ""} · {v.org.name}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <form action={`/api/admin/venues/${v.id}/approve`} method="POST">
                    <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors">
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                  </form>
                  <form action={`/api/admin/venues/${v.id}/reject`} method="POST">
                    <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 text-xs font-semibold px-3 py-1.5 transition-colors">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending caterers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-orange-400" />
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Pending caterers ({pendingCaterers.length})</h2>
          </div>
          <Link href="/admin/caterers" className="text-xs font-semibold text-amber-600 hover:underline">Manage all →</Link>
        </div>
        {pendingCaterers.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-400">
            No pending caterers.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingCaterers.map((c) => (
              <div key={c.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">{c.name}</div>
                  <div className="text-sm text-zinc-500">{c.city} · {c.phone}{c.cuisines.length > 0 ? ` · ${c.cuisines.slice(0, 2).join(", ")}` : ""}</div>
                </div>
                <form action={`/api/admin/caterers/${c.id}/approve`} method="POST">
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors">
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
