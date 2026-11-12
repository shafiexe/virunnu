import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { getCatererForSession } from "@/lib/caterer-session";
import { purchaseFormOptions } from "@/lib/caterer-purchase-options";
import { BackToList } from "@/components/back-to-list";
import { CatererPurchaseForm } from "@/components/caterer-purchase-form";

export default async function NewPurchasePage() {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");
  const opts = await purchaseFormOptions(ctx.caterer.id, ctx.caterer.orgId!);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 [&>*]:max-w-3xl space-y-5">
      <BackToList href="/caterer/purchases" label="Back to purchases" />
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">New purchase</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Record what you bought, from whom, and who bought it</p>
      </div>
      <CatererPurchaseForm {...opts} />
    </div>
  );
}
