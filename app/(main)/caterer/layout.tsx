import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { loadTemplates } from "@/lib/caterer-templates-server";
import { orgLogoUrl } from "@/lib/org-logo";
import { CatererShell } from "@/components/caterer-sidebar";

export default async function CatererLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "CATERER") redirect("/login");

  const pendingEnquiries = session.orgId
    ? await db.cateringEnquiry.count({ where: { status: "PENDING", caterer: { orgId: session.orgId } } })
    : 0;

  const [logoUrl, templates, caterer] = await Promise.all([
    orgLogoUrl(session.orgId),
    loadTemplates(session.orgId),
    session.orgId ? db.caterer.findFirst({ where: { orgId: session.orgId }, select: { name: true, upiId: true } }) : null,
  ]);

  return <CatererShell pendingEnquiries={pendingEnquiries} logoUrl={logoUrl} name={caterer?.name} upiId={caterer?.upiId} templates={templates} deny={session.deny} mainOwner={!session.tm}>{children}</CatererShell>;
}
