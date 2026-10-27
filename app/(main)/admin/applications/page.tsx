import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { AdminApplicationsClient } from "@/components/admin-applications-client";

export default async function AdminApplicationsPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const [ownerApps, catererApps] = await Promise.all([
    db.ownerApplication.findMany({ orderBy: { createdAt: "desc" } }),
    db.catererApplication.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return <AdminApplicationsClient initialOwnerApps={ownerApps} initialCatererApps={catererApps} />;
}
