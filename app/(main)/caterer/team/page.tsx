import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { CatererTeamManager } from "@/components/caterer-team-manager";

export default async function TeamPage() {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  // only the main owner manages logins
  if (ctx.session.tm) redirect("/caterer/no-access");
  const members = await db.user.findMany({
    where: { orgId: ctx.caterer.orgId, teamMember: true }, orderBy: { createdAt: "asc" },
    select: { id: true, name: true, phone: true, deny: true, disabled: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Team logins</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Give people their own login. Each sees every page until you hide some. Only you can add or change logins.</p>
      </div>
      <CatererTeamManager initial={members} business={ctx.caterer.name} />
    </div>
  );
}
