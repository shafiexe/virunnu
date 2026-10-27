import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { AdminOwnersClient } from "@/components/admin-owners-client";

export default async function AdminOwnersPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const orgs = await db.organization.findMany({
    where: { type: "CONVENTION" },
    include: {
      users: { where: { role: "OWNER" }, select: { id: true, name: true, phone: true } },
      venues: { select: { id: true, name: true, approved: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <AdminOwnersClient initialOrgs={orgs} />;
}
