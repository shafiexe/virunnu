import { expect, test, type Page } from "@playwright/test";
import { account, signIn } from "./helpers";

// Visits pages the way a person would and reports anything the browser complains about: script errors, failed requests,
// pictures that did not load. A signed-out visitor's harmless 401 from the "who am I" check is ignored.
async function visit(page: Page, path: string) {
  const problems: string[] = [];
  const onConsole = (m: import("@playwright/test").ConsoleMessage) => { if (m.type() === "error" && !/401 \(Unauthorized\)|Failed to load resource.*(401|404)/.test(m.text())) problems.push(`console: ${m.text().slice(0, 120)}`); };
  const onError = (e: Error) => problems.push(`script error: ${String(e).slice(0, 120)}`);
  const onFail = (r: import("@playwright/test").Response) => { const u = r.url(); if (r.status() >= 500) problems.push(`${r.status()} ${u.replace(/^https?:\/\/[^/]+/, "").slice(0, 80)}`); };
  page.on("console", onConsole); page.on("pageerror", onError); page.on("response", onFail);
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  if (res && res.status() >= 400 && res.status() !== 404) problems.push(`page answered ${res.status()}`);
  // pictures on the page that finished loading but are empty
  const broken = await page.locator("img").evaluateAll((ns) => ns.filter((n) => { const i = n as HTMLImageElement; return i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:"); }).map((n) => (n as HTMLImageElement).src.slice(0, 90)));
  if (broken.length) problems.push(`broken pictures: ${broken.join(", ")}`);
  page.off("console", onConsole); page.off("pageerror", onError); page.off("response", onFail);
  return problems.map((p) => `${path}: ${p}`);
}

test.describe.configure({ timeout: 400_000 });

test("public pages and the sign-in pages are free of errors", async ({ page }) => {
  const a = account();
  const all: string[] = [];
  for (const p of ["/", "/login", "/apply/venue", "/apply/caterer", "/track", "/privacy", "/terms", `/venues/${a.centre.venueId}`, `/caterers/${a.catererId}`, "/definitely-not-a-page"]) all.push(...(await visit(page, p)));
  expect(all, all.join("\n")).toEqual([]);
});

test("every convention-centre page is free of errors", async ({ page }) => {
  const { centre } = account();
  await signIn(page.context(), centre.phone, centre.password);
  const all: string[] = [];
  for (const p of ["dashboard", "calendar", "enquiries", "bookings", "customers", "expenses", "reports", "venues", "facilities", "workflows", "team", "activity"]) all.push(...(await visit(page, `/owner/${p}`)));
  expect(all, all.join("\n")).toEqual([]);
});

test("every catering page is free of errors", async ({ page }) => {
  const a = account();
  await signIn(page.context(), a.phone, a.password);
  const all: string[] = [];
  for (const p of ["dashboard", "calendar", "orders", "orders/new", "enquiries", "quotes", "quotes/new", "daybook", "purchases", "purchases/new", "expenses", "reports", "customers", "followup", "suppliers", "staff", "items", "profile", "messages", "team", "activity"]) all.push(...(await visit(page, `/caterer/${p}`)));
  expect(all, all.join("\n")).toEqual([]);
});

test("every admin page is free of errors", async ({ page }) => {
  const a = account();
  expect((await page.context().request.post("/api/admin/auth/login", { data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } })).ok()).toBeTruthy();
  const all: string[] = [];
  for (const p of ["/admin", "/admin/owners", "/admin/caterers", "/admin/applications", `/admin/owners/${a.centre.orgId}`, `/admin/caterers/${a.catererId}`]) all.push(...(await visit(page, p)));
  expect(all, all.join("\n")).toEqual([]);
});
