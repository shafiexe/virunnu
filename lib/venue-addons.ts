import type { Prisma } from "@prisma/client";
import { priceAddon } from "@/lib/addons";

export type AddonPick = { id: string; quantity: number };

// Look up the picked add-ons on the venue and price them there — never trust prices sent by the browser.
export async function resolveAddons(tx: Prisma.TransactionClient, venueId: string, picks: AddonPick[] | undefined) {
  if (!picks?.length) return { rows: [], totalPaise: 0 };
  const ids = new Set(picks.map((p) => p.id));
  const found = await tx.venueAddon.findMany({ where: { id: { in: [...ids] }, venueId, active: true } });
  if (found.length !== ids.size) throw new Error("ADDON_UNAVAILABLE");
  const rows = found.map((a) => ({ name: a.name, ...priceAddon(a, picks.find((p) => p.id === a.id)!.quantity) }));
  return { rows, totalPaise: rows.reduce((s, r) => s + r.pricePaise, 0) };
}
