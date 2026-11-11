export type AddonUnit = "FIXED" | "HOUR";

export const MIN_ADDON_HOURS = 0.5;
export const MAX_ADDON_HOURS = 48;

// Hours are entered in half-hour steps.
export function clampHours(n: number) {
  const v = Math.round((Number(n) || 1) * 2) / 2;
  return Math.min(MAX_ADDON_HOURS, Math.max(MIN_ADDON_HOURS, v));
}

// Price one add-on for a booking. Fixed add-ons are always a single charge; hourly ones multiply by hours.
export function priceAddon(addon: { unit: AddonUnit; pricePaise: number }, quantity: number) {
  const q = addon.unit === "HOUR" ? clampHours(quantity) : 1;
  return { unit: addon.unit, quantity: q, unitPricePaise: addon.pricePaise, pricePaise: Math.round(addon.pricePaise * q) };
}

export const formatHours = (q: number) => `${q} ${q === 1 ? "hr" : "hrs"}`;

// "1.5 hrs × ₹500" for hourly lines, nothing for fixed ones.
export function addonDetail(a: { unit: AddonUnit; quantity: number; unitPricePaise: number | null }) {
  if (a.unit !== "HOUR" || a.unitPricePaise == null) return null;
  return `${formatHours(a.quantity)} × ₹${(a.unitPricePaise / 100).toLocaleString("en-IN")}`;
}
