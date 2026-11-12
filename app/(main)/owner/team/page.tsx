import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { OWNER_ACCESS_TREE } from "@/lib/owner-access";
import { CatererTeamManager } from "@/components/caterer-team-manager";

export default async function OwnerTeamPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");
  // only the main owner manages logins
  if (session.tm) redirect("/owner/no-access");
  const [org, members] = await Promise.all([
    db.organization.findUnique({ where: { id: session.orgId }, select: { name: true } }),
    db.user.findMany({ where: { orgId: session.orgId, teamMember: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, phone: true, deny: true, disabled: true } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Team logins</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Give people their own login. Each sees every page until you hide some. Only you can add or change logins.</p>
      </div>
      <CatererTeamManager initial={members} business={org?.name ?? "your centre"} tree={OWNER_ACCESS_TREE} apiBase="/api/owner/team" product="convention centre" />
    </div>
  );
}
