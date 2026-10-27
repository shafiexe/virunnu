import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { FacilitiesManager } from "@/components/facilities-manager";

export default async function OwnerFacilitiesPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const facilities = await db.facility.findMany({
    where: { orgId: session.orgId },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
  });

  return (
    <FacilitiesManager
      initial={facilities}
      isEmpty={facilities.length === 0}
    />
  );
}
