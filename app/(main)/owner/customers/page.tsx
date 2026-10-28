import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { OwnerCustomersTable } from "@/components/owner-customers-table";

export default async function OwnerCustomersPage() {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <OwnerCustomersTable />
    </div>
  );
}
