import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { account, signIn } from "./helpers";

// A first automatic pass (it finds roughly a third of accessibility problems; a person must check the rest).
// Prints everything it finds, and fails on anything serious or critical (colour contrast included).
const found: Record<string, { id: string; impact: string; count: number; help: string }[]> = {};

async function scan(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  found[path] = r.violations.map((v) => ({ id: v.id, impact: v.impact ?? "", count: v.nodes.length, help: v.help }));
  if (process.env.A11Y_DETAIL) for (const v of r.violations) for (const n of v.nodes) console.log("A11Y-NODE", path, v.id, n.target.join(" "), (n.any[0]?.message ?? "").slice(0, 110));
}

test.describe.configure({ timeout: 300_000 });
test("scan the main pages", async ({ page }) => {
  const a = account();
  for (const p of ["/", "/login", `/venues/${a.centre.venueId}`, `/caterers/${a.catererId}`, "/track"]) await scan(page, p);
  await signIn(page.context(), a.centre.phone, a.centre.password);
  for (const p of ["/owner/dashboard", "/owner/bookings", "/owner/calendar"]) await scan(page, p);
  await page.context().clearCookies();
  await signIn(page.context(), a.phone, a.password);
  for (const p of ["/caterer/dashboard", "/caterer/orders", "/caterer/orders/new"]) await scan(page, p);
  const sum: Record<string, { impact: string; pages: number; nodes: number; help: string }> = {};
  for (const list of Object.values(found)) for (const v of list) { const s = (sum[v.id] ??= { impact: v.impact, pages: 0, nodes: 0, help: v.help }); s.pages++; s.nodes += v.count; }
  console.log("A11Y " + JSON.stringify(Object.entries(sum).sort((x, y) => ["critical", "serious", "moderate", "minor"].indexOf(x[1].impact) - ["critical", "serious", "moderate", "minor"].indexOf(y[1].impact)).map(([id, s]) => `${s.impact} · ${id} · ${s.pages} pages, ${s.nodes} places · ${s.help}`), null, 1));
  const bad = Object.entries(found).flatMap(([path, list]) => list.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${path}: ${v.id} (${v.count})`));
  expect(bad, "serious or critical accessibility problems").toEqual([]);
});
