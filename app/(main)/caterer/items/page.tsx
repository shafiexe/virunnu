import { connection } from "next/server";
export const instant = false;
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCatererForSession } from "@/lib/caterer-session";
import { CatererItemsManager, type PriceItem } from "@/components/caterer-items-manager";

export default async function CatererItemsPage() {
  await connection();
  const ctx = await getCatererForSession();
  if (!ctx) redirect("/caterer/onboarding");

  const items = await db.catererItem.findMany({
    where: { catererId: ctx.caterer.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Menu &amp; Prices</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Everything you sell, with your usual rates. Orders pick from here, and dishes you tick “Show on my public page” make up the menu customers see.</p>
      </div>
      <CatererItemsManager initial={items as PriceItem[]} />
    </div>
  );
}
