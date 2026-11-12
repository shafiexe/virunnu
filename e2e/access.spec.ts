import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { expect, test } from "@playwright/test";
import { account, signIn } from "./helpers";

// Every API route, found by reading the folders: its address and the methods it answers.
function routes(dir = "app/api", base = "/api"): { url: string; method: string }[] {
  const out: { url: string; method: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { out.push(...routes(full, `${base}/${name.replace(/^\[(.+)\]$/, "cmwzzzzzzzzzzzzzzzzzzzzzz")}`)); continue; }
    if (name !== "route.ts") continue;
    for (const m of readFileSync(full, "utf-8").matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)) out.push({ url: base, method: m[1] });
  }
  return out;
}
const ALL = routes();

// What a signed-out visitor may legitimately get an answer from
const PUBLIC_OK = [/^GET \/api\/health$/, /^POST \/api\/client-error$/, /^GET \/api\/caterers$/, /^GET \/api\/venues\//, /^(GET|POST) \/api\/auth\/logout$/, /^GET \/api\/img\//, /^GET \/api\/logo\//, /^GET \/api\/geocode$/, /^GET \/api\/venues$/, /^GET \/api\/owner\/waiting$/,
  // open only while developing: on a live site they refuse without CRON_SECRET (see the cron routes)
  /^GET \/api\/cron\//];
const call = (ctx: import("@playwright/test").APIRequestContext, r: { url: string; method: string }) =>
  ctx.fetch(r.url + (r.method === "GET" ? "?q=probe" : ""), { method: r.method, data: r.method === "GET" || r.method === "DELETE" ? undefined : {}, failOnStatusCode: false, maxRedirects: 0 });

test.describe.configure({ timeout: 300_000 });

test("signed out, no private endpoint answers and nothing crashes", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const bad: string[] = [];
  for (const r of ALL) {
    const res = await call(ctx, r);
    const key = `${r.method} ${r.url}`;
    const open = PUBLIC_OK.some((p) => p.test(key));
    if (res.status() >= 500) bad.push(`${key} -> ${res.status()} (crash)`);
    else if (!open && res.status() >= 200 && res.status() < 300) bad.push(`${key} -> ${res.status()} (answers a visitor)`);
  }
  expect(bad, bad.join("\n")).toEqual([]);
  await ctx.dispose();
});

test("a caterer cannot use the convention centre's API, and a centre cannot use the caterer's", async ({ browser }) => {
  const a = account();
  const cat = await browser.newContext(); await signIn(cat, a.phone, a.password);
  const cen = await browser.newContext(); await signIn(cen, a.centre.phone, a.centre.password);
  const bad: string[] = [];
  for (const r of ALL) {
    if (/^\/api\/(owner)\//.test(r.url) && !/\/api\/owner\/(expenses|expense-categories|employees|logo|team|activity|waiting)/.test(r.url)) {
      const res = await call(cat.request, r);
      if (res.status() < 400 || res.status() >= 500) bad.push(`caterer ${r.method} ${r.url} -> ${res.status()}`);
    }
    if (/^\/api\/caterer\//.test(r.url)) {
      const res = await call(cen.request, r);
      if (res.status() < 400 || res.status() >= 500) bad.push(`centre ${r.method} ${r.url} -> ${res.status()}`);
    }
  }
  expect(bad, bad.join("\n")).toEqual([]);
  await cat.close(); await cen.close();
});

// One business must never reach another's records by knowing, or guessing, an id
test("two centres, and two caterers, cannot see or change each other's records", async ({ browser, playwright }) => {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const admin = await playwright.request.newContext({ baseURL: base });
  await admin.post("/api/admin/auth/login", { data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
  const stamp = Date.now().toString().slice(-6);

  // a second centre and a second caterer, with one record each
  const bC = await (await admin.post("/api/admin/owners", { data: { name: `ZZ Other Centre ${stamp}`, phone: `98467${stamp.slice(-5)}`, email: `oc${stamp}@example.com`, address: "Road, Kochi", city: "Kochi", capacity: 300, priceRupees: 80000 } })).json();
  const bK = await (await admin.post("/api/admin/caterers", { data: { name: `ZZ Other Caterer ${stamp}`, phone: `98468${stamp.slice(-5)}`, email: `ok${stamp}@example.com`, city: "Kochi", whatsappNumber: `98468${stamp.slice(-5)}`, description: "x", photos: [], packages: [{ name: "Gold", pricePerPlate: 200, isVeg: true, dishes: ["Rice"] }], minGuests: 10, maxGuests: 100 } })).json();
  const other = await browser.newContext(); const otherCat = await browser.newContext(); const mine = await browser.newContext(); const cat = await browser.newContext();
  try {
    await signIn(other, String(bC.phone).replace(/^\+91/, ""), bC.password);
    await signIn(otherCat, String(bK.phone).replace(/^\+91/, ""), bK.password);

  const now = new Date(); const date = new Date(Date.now() + 90 * 86400_000);
  const cal = await (await other.request.get(`/api/owner/calendar?venueId=${bC.venueId}&year=${date.getFullYear()}&month=${date.getMonth() + 1}`)).json();
  const hall = cal.venue.halls[0];
  const booking = await (await other.request.post("/api/owner/bookings", { data: { venueId: bC.venueId, hallId: hall.id, templateId: hall.slotTemplates[0].id, date: date.toLocaleDateString("en-CA"), customerPhone: "9000000881", customerName: "Secret Customer", amountRupees: 80000, advanceRupees: 20000 } })).json();
  const bookingId = booking.booking.id as string;
  const item = await (await otherCat.request.post("/api/caterer/items", { data: { name: "Secret dish", group: "FOOD", unit: "plate", rate: 500, active: true } })).json();
  void now;

  // the usual centre (account A) tries everything against B's booking
  const a = account();
  await signIn(mine, a.centre.phone, a.centre.password);
  const attempts: [string, string, object?][] = [
    ["PATCH", `/api/owner/bookings/${bookingId}`, { customerName: "Hacked" }], ["DELETE", `/api/owner/bookings/${bookingId}`],
    ["POST", `/api/owner/bookings/${bookingId}/payments`, { amountRupees: 100 }], ["POST", `/api/owner/bookings/${bookingId}/cash`, {}],
    ["PATCH", `/api/owner/bookings/${bookingId}/discount`, { discountPaise: 100 }], ["POST", `/api/owner/bookings/${bookingId}/refund`, {}],
    ["POST", `/api/owner/bookings/${bookingId}/restore`, {}], ["POST", `/api/owner/bookings/${bookingId}/approve`, {}], ["POST", `/api/owner/bookings/${bookingId}/reject`, {}],
    ["POST", `/api/owner/bookings/${bookingId}/caterer/send`, {}], ["PATCH", `/api/owner/bookings/${bookingId}/caterer`, { catererId: null }],
    ["GET", `/api/owner/bookings/${bookingId}/pdf`], ["POST", `/api/owner/halls/${hall.id}/photos`, { url: "https://example.com/x.jpg" }],
  ];
  const leaked: string[] = [];
  for (const [method, url, data] of attempts) {
    const res = await mine.request.fetch(url, { method, data, failOnStatusCode: false });
    if (![401, 403, 404, 405, 409, 400].includes(res.status()) || (res.status() === 409 && method !== "POST")) leaked.push(`${method} ${url} -> ${res.status()}`);
    expect((await res.text()), `${method} ${url}`).not.toContain("Secret Customer");
  }
  // the pages say nothing of it either
  const page = await mine.newPage();
  for (const path of [`/owner/bookings/${bookingId}`, `/owner/bookings/${bookingId}/invoice`]) {
    await page.goto(path);
    await expect(page.getByText("Secret Customer"), path).toHaveCount(0);
  }
  // its record is untouched
  const check = await (await other.request.get(`/api/owner/bookings?search=Secret`)).json();
  expect(JSON.stringify(check)).toContain("Secret Customer");
  expect(JSON.stringify(check)).not.toContain("Hacked");
  expect(leaked, leaked.join("\n")).toEqual([]);

  // and a caterer cannot change or delete another caterer's price-list item
  await signIn(cat, a.phone, a.password);
  const itemId = item.item?.id as string;
  for (const [method, data] of [["PATCH", { name: "Hacked" }], ["DELETE", undefined]] as [string, object | undefined][]) {
    const res = await cat.request.fetch(`/api/caterer/items/${itemId}`, { method, data, failOnStatusCode: false });
    expect([403, 404], `caterer ${method} item -> ${res.status()}`).toContain(res.status());
  }
  const mineList = await (await cat.request.get("/api/caterer/items")).json();
  expect(JSON.stringify(mineList)).not.toContain("Secret dish");
  } finally {
    await other.close(); await otherCat.close(); await mine.close(); await cat.close();
    await admin.delete(`/api/admin/owners/${bC.orgId}`); await admin.delete(`/api/admin/caterers/${bK.catererId}`); await admin.dispose();
  }
});
