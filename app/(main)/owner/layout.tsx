import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { OwnerSidebar, OwnerTopTabs } from "@/components/owner-sidebar";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <OwnerSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OwnerTopTabs />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
