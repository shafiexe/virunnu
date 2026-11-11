import { db } from "@/lib/db";

// Address of the business's logo, or null when none has been uploaded. Changes whenever the logo does, so browsers never show an old one.
export async function orgLogoUrl(orgId: string | null | undefined) {
  if (!orgId) return null;
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { logoUpdatedAt: true } });
  return org?.logoUpdatedAt ? `/api/logo/${orgId}?v=${org.logoUpdatedAt.getTime()}` : null;
}
