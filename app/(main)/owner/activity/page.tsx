import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ActivityList } from "@/components/activity-list";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ by?: string; page?: string; pageSize?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");
  // only the main owner sees what the team did
  if (session.tm) redirect("/owner/no-access");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Activity</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Who recorded or deleted what, newest first</p>
      </div>
      <ActivityList orgId={session.orgId} basePath="/owner/activity" sp={await searchParams} />
    </div>
  );
}
