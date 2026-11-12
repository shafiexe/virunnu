import { db } from "@/lib/db";
import { syncSuppliers } from "@/lib/caterer-suppliers-server";

// Lists the purchase form needs: people on the team, recent functions to charge the cost to, and past suppliers.
export async function purchaseFormOptions(catererId: string, orgId: string) {
  await syncSuppliers(catererId);
  const [people, orders, past] = await Promise.all([
    db.employee.findMany({ where: { orgId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.catererOrder.findMany({
      where: { catererId, status: { not: "CANCELLED" } },
      orderBy: { date: "desc" },
      take: 60,
      select: { id: true, date: true, customer: { select: { name: true } } },
    }),
    db.catererSupplier.findMany({ where: { catererId, active: true }, select: { id: true, name: true, category: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    people,
    functions: orders.map((o) => ({ id: o.id, label: `${o.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · ${o.customer.name}` })),
    suppliers: past,
  };
}
