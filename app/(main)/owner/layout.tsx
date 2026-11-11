import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { OwnerSidebar, OwnerTopTabs } from "@/components/owner-sidebar";
import { db } from "@/lib/db";
import { orgLogoUrl } from "@/lib/org-logo";
import { ToastProvider } from "@/components/undo-toast";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");

  const [logoUrl, org] = await Promise.all([orgLogoUrl(session.orgId), session.orgId ? db.organization.findUnique({ where: { id: session.orgId }, select: { name: true } }) : null]);

  return (
    <ToastProvider>
      <div className="flex min-h-[calc(100vh-56px)]">
        <OwnerSidebar logoUrl={logoUrl} name={org?.name} />
        <div className="flex-1 flex flex-col min-w-0">
          <OwnerTopTabs />
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
