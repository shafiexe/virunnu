import { db } from "@/lib/db";
import { deleteOrgImages } from "@/lib/image-store";

// What is left when a catering team or a convention centre is deleted: the logins, the organisation, its activity list and its photos.
// An organisation that still has another venue or caterer keeps its logins and its record; only the photos are tidied then.
export async function removeOrgLeftovers(orgId: string | null | undefined) {
  if (!orgId) return;
  const [venues, caterers] = await Promise.all([db.venue.count({ where: { orgId } }), db.caterer.count({ where: { orgId } })]);
  await deleteOrgImages(orgId);
  if (venues > 0 || caterers > 0) return;
  await db.$transaction([
    db.activityLog.deleteMany({ where: { orgId } }),
    db.employee.deleteMany({ where: { orgId } }),
    db.expense.deleteMany({ where: { orgId } }),
    db.user.deleteMany({ where: { orgId } }),
    db.organization.deleteMany({ where: { id: orgId } }),
  ]);
}
