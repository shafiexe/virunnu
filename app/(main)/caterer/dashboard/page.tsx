import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { CheckCircle, Clock, MapPin } from "lucide-react";
import { MenuManager } from "@/components/menu-manager";

export default async function CatererDashboard() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "CATERER") redirect("/login");

  const caterer = session.orgId
    ? await db.caterer.findFirst({
        where: { orgId: session.orgId },
        include: { menuItems: true },
      })
    : null;

  if (!caterer) redirect("/caterer/onboarding");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{caterer.name}</h1>
          <div className="flex items-center gap-1 text-zinc-500 text-sm mt-1">
            <MapPin className="h-4 w-4" />
            {caterer.city}, Kerala
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            caterer.approved
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          }`}
        >
          {caterer.approved ? (
            <><CheckCircle className="h-3.5 w-3.5" /> Listed</>
          ) : (
            <><Clock className="h-3.5 w-3.5" /> Pending approval</>
          )}
        </span>
      </div>

      {!caterer.approved && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-5">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Your profile is under review. Our team will approve it within 24–48 hours. You&apos;ll be visible to customers once approved.
          </p>
        </div>
      )}

      {/* Profile card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Your profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">Phone</div>
            <div className="text-zinc-900 dark:text-zinc-50">{caterer.phone}</div>
          </div>
          <div>
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">City</div>
            <div className="text-zinc-900 dark:text-zinc-50">{caterer.city}</div>
          </div>
          {caterer.cuisines.length > 0 && (
            <div className="col-span-2">
              <div className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">Cuisines</div>
              <div className="flex flex-wrap gap-1.5">
                {caterer.cuisines.map((c) => (
                  <span key={c} className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs px-2.5 py-1 rounded-full font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {caterer.description && (
            <div className="col-span-2">
              <div className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">About</div>
              <div className="text-zinc-700 dark:text-zinc-300">{caterer.description}</div>
            </div>
          )}
        </div>
      </div>

      {/* Menu items */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Menu items</h2>
        <MenuManager initialItems={caterer.menuItems} />
      </div>
    </div>
  );
}
