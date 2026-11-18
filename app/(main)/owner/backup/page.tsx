import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { entitiesFor } from "@/lib/backup/registry";
import { BackupManager } from "@/components/backup-manager";

export default async function OwnerBackupPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");
  if (session.tm) redirect("/owner/no-access");
  const last = await db.activityLog.findFirst({ where: { orgId: session.orgId, action: "backup" }, orderBy: { at: "desc" }, select: { at: true } });
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Backup</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Keep your own copy of your bookings, payments, expenses and settings. Only you can download or restore.</p>
      </div>
      <BackupManager kind="OWNER" lastBackup={last?.at.toISOString() ?? null} labels={Object.fromEntries(entitiesFor("OWNER").map((e) => [e.key, e.label]))} />
    </div>
  );
}
