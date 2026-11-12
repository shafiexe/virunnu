import { connection } from "next/server";
export const instant = false;
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { purchaseFormOptions } from "@/lib/caterer-purchase-options";
import { BackToList } from "@/components/back-to-list";
import { CatererPurchaseForm } from "@/components/caterer-purchase-form";
import { PurchasePayments } from "@/components/caterer-purchase-actions";

export default async function EditPurchasePage({ params }: { params: Promise<{ purchaseId: string }> }) {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const { purchaseId } = await params;
  const purchase = await db.catererPurchase.findFirst({
    where: { id: purchaseId, catererId: ctx.caterer.id },
    include: { lines: { orderBy: { sortOrder: "asc" } }, payments: { orderBy: { paidOn: "asc" } } },
  });
  if (!purchase) notFound();
  const opts = await purchaseFormOptions(ctx.caterer.id, ctx.caterer.orgId!);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <BackToList href="/caterer/purchases" label="Back to purchases" />
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Purchase from {purchase.supplier}</h1>
      <PurchasePayments
        purchaseId={purchase.id} totalPaise={purchase.totalPaise} paidPaise={purchase.paidPaise}
        payments={purchase.payments.map((p) => ({ id: p.id, amountPaise: p.amountPaise, method: p.method, note: p.note, paidOn: p.paidOn.toISOString(), recordedBy: p.recordedBy }))}
      />
      <CatererPurchaseForm
        {...opts}
        initial={{
          id: purchase.id, date: purchase.date.toISOString().slice(0, 10), supplier: purchase.supplier, supplierId: purchase.supplierId, billNo: purchase.billNo, category: purchase.category,
          totalPaise: purchase.totalPaise, paidPaise: purchase.paidPaise, employeeId: purchase.employeeId, orderId: purchase.orderId, notes: purchase.notes,
          lines: purchase.lines.map((l) => ({ name: l.name, unit: l.unit, quantity: l.quantity, ratePaise: l.ratePaise })),
        }}
      />
    </div>
  );
}
