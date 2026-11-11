import { connection } from "next/server";
export const instant = false;
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { BackToList } from "@/components/back-to-list";
import { gstFor } from "@/lib/caterer-gst";
import { loadOrderInitial } from "@/lib/caterer-order-initial";
import { CatererOrderForm } from "@/components/caterer-order-form";
import type { PriceItem } from "@/components/caterer-items-manager";

export default async function EditOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { orderId } = await params;

  const [loaded, items, people] = await Promise.all([
    loadOrderInitial(ctx.caterer.id, orderId),
    db.catererItem.findMany({ where: { catererId: ctx.caterer.id }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.employee.findMany({ where: { orgId: ctx.caterer.orgId!, isActive: true }, select: { id: true, name: true, role: true, payType: true, salaryPaise: true, dailyRatePaise: true }, orderBy: { name: "asc" } }),
  ]);
  if (!loaded) notFound();
  const { initial, billGst } = loaded;
  const gstRates = { FOOD: billGst.FOOD ?? gstFor(ctx.caterer, "FOOD"), SERVICE: billGst.SERVICE ?? gstFor(ctx.caterer, "SERVICE") };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <BackToList href={`/caterer/orders/${initial.id}`} label="Back to order" />
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Edit order — {initial.customerName}</h1>
      <CatererOrderForm people={people.map((e) => ({ id: e.id, name: e.name, role: e.role, payType: (e.payType === "DAILY" ? "DAILY" : "MONTHLY") as "DAILY" | "MONTHLY", ratePaise: (e.payType === "DAILY" ? e.dailyRatePaise : e.salaryPaise) ?? 0 }))} catalog={items as PriceItem[]} initial={initial} gstRates={gstRates} />
    </div>
  );
}
