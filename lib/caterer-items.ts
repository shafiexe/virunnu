import { z } from "zod";

export const ITEM_GROUPS = ["FOOD", "EQUIPMENT", "STAFF", "DECOR", "OTHER"] as const;
export type ItemGroupKey = (typeof ITEM_GROUPS)[number];

export const GROUP_LABEL: Record<ItemGroupKey, string> = {
  FOOD: "Food",
  EQUIPMENT: "Equipment",
  STAFF: "Staff",
  DECOR: "Decoration",
  OTHER: "Other",
};

export const UNITS = ["nos", "kg", "plate", "litre", "set", "day", "hour"] as const;

// Starter list taken from the team's own Vyapar bills — names tidied, rates as billed. Edit after adding.
export const STARTER_ITEMS: { name: string; group: ItemGroupKey; unit: string; rate: number }[] = [
  { name: "Welcome drink", group: "FOOD", unit: "nos", rate: 12 },
  { name: "Beef biriyani", group: "FOOD", unit: "kg", rate: 900 },
  { name: "Kashmiri pulav", group: "FOOD", unit: "kg", rate: 900 },
  { name: "Afghani rice", group: "FOOD", unit: "kg", rate: 800 },
  { name: "Chicken chilly broast", group: "FOOD", unit: "kg", rate: 450 },
  { name: "Chicken kondattam", group: "FOOD", unit: "kg", rate: 450 },
  { name: "Beef varattu", group: "FOOD", unit: "kg", rate: 600 },
  { name: "Beef stew", group: "FOOD", unit: "kg", rate: 600 },
  { name: "Fish fry", group: "FOOD", unit: "kg", rate: 600 },
  { name: "Fish pollichath", group: "FOOD", unit: "kg", rate: 850 },
  { name: "Mini sadhya", group: "FOOD", unit: "plate", rate: 70 },
  { name: "Poratta", group: "FOOD", unit: "nos", rate: 12 },
  { name: "Vellapam", group: "FOOD", unit: "nos", rate: 6 },
  { name: "Nice pathiri", group: "FOOD", unit: "nos", rate: 5 },
  { name: "Nool puttu", group: "FOOD", unit: "nos", rate: 6 },
  { name: "Pudding", group: "FOOD", unit: "nos", rate: 500 },
  { name: "Gulab jamun", group: "FOOD", unit: "nos", rate: 11 },
  { name: "Ceramic plate", group: "EQUIPMENT", unit: "nos", rate: 4 },
  { name: "Juice glass", group: "EQUIPMENT", unit: "nos", rate: 4 },
  { name: "Salad bowl", group: "EQUIPMENT", unit: "nos", rate: 4 },
  { name: "Curry bowl", group: "EQUIPMENT", unit: "nos", rate: 10 },
  { name: "Wood tray", group: "EQUIPMENT", unit: "nos", rate: 40 },
  { name: "Jug", group: "EQUIPMENT", unit: "nos", rate: 10 },
  { name: "Basin", group: "EQUIPMENT", unit: "nos", rate: 20 },
  { name: "Bucket", group: "EQUIPMENT", unit: "nos", rate: 25 },
  { name: "Table settings", group: "EQUIPMENT", unit: "set", rate: 250 },
  { name: "Vessels", group: "EQUIPMENT", unit: "set", rate: 500 },
  { name: "Service boys", group: "STAFF", unit: "nos", rate: 650 },
  { name: "Captain", group: "STAFF", unit: "nos", rate: 900 },
  { name: "Supervisor", group: "STAFF", unit: "nos", rate: 750 },
  { name: "Hosting boys", group: "STAFF", unit: "nos", rate: 1200 },
  { name: "Welcome counter", group: "DECOR", unit: "nos", rate: 3000 },
  { name: "Islamic counter", group: "DECOR", unit: "nos", rate: 3500 },
  { name: "Entrance decoration", group: "DECOR", unit: "nos", rate: 4000 },
  { name: "Mineral water", group: "OTHER", unit: "nos", rate: 6 },
  { name: "Disposables", group: "OTHER", unit: "set", rate: 400 },
  { name: "Fuel", group: "OTHER", unit: "nos", rate: 60 },
];

export const itemBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  group: z.enum(ITEM_GROUPS).default("FOOD"),
  unit: z.string().trim().min(1).max(20).default("nos"),
  rate: z.number().min(0).max(10000000).default(0),
  active: z.boolean().default(true),
  // the public menu: whether the dish is shown on the caterer's public page, and what a customer reads about it
  showOnPublic: z.boolean().optional(),
  category: z.string().trim().max(50).optional(),
  description: z.string().trim().max(300).optional(),
  isVeg: z.boolean().optional(),
  isSpecial: z.boolean().optional(),
});

// The public page and the admin screens read dishes in this shape
export const toMenuDish = (i: { id: string; name: string; category: string | null; description: string | null; ratePaise: number; unit: string; isVeg: boolean; isSpecial: boolean }) => ({
  id: i.id, name: i.name, category: i.category ?? "Menu", description: i.description, priceRupees: Math.round(i.ratePaise / 100), unit: i.unit, isVeg: i.isVeg, isSpecial: i.isSpecial,
});
