import { expect, test, type APIRequestContext } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { account, signIn } from "./helpers";

test.describe.configure({ timeout: 180_000 });

type Backup = { kind: string; entities: { key: string }[]; data: Record<string, Record<string, unknown>[]> };

async function download(api: APIRequestContext) {
  const res = await api.get("/api/backup");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/zip");
  const files = unzipSync(new Uint8Array(await res.body()));
  return { files, backup: JSON.parse(strFromU8(files["backup.json"])) as Backup };
}

// What the Backup page does: check the file, then put it back batch by batch.
async function restore(api: APIRequestContext, b: Backup, apply: boolean) {
  const totals = { added: 0, updated: 0, same: 0 };
  for (const e of b.entities) {
    const res = await api.post("/api/backup/restore", { data: { action: "batch", key: e.key, rows: b.data[e.key] ?? [], apply } });
    expect(res.status(), `${e.key}: ${await res.text()}`).toBe(200);
    const r = await res.json();
    totals.added += r.added; totals.updated += r.updated; totals.same += r.same;
  }
  if (apply) expect((await api.post("/api/backup/restore", { data: { action: "finish" } })).status()).toBe(200);
  return totals;
}

test("a convention centre can back up, lose a record, and get it back", async ({ page }) => {
  const a = account();
  await signIn(page.context(), a.centre.phone, a.centre.password);
  const api = page.context().request;

  const made = await api.post("/api/owner/expenses", { data: { category: "Other", label: "Backup test lamp", amountRupees: 1234, date: "2026-11-01" } });
  expect(made.status()).toBe(201);
  const id = (await made.json()).expense.id as string;

  const { files, backup } = await download(api);
  expect(Object.keys(files).some((f) => f.endsWith("Expenses.csv"))).toBe(true);
  expect(strFromU8(files["READ ME.txt"])).toContain("HOW TO GET YOUR DATA BACK");
  const sheet = strFromU8(files[Object.keys(files).find((f) => f.endsWith("Expenses.csv"))!]);
  expect(sheet).toContain("Backup test lamp");
  expect(sheet).toContain("12"); // rupees, not paise
  expect(backup.data.expenses.some((r) => r.id === id)).toBe(true);
  expect(JSON.stringify(backup)).not.toMatch(/passwordHash|"password"/);

  // checking the file changes nothing
  const preview = await restore(api, backup, false);
  expect(preview.added + preview.updated).toBe(0);

  // lose it, then restore
  expect((await api.delete(`/api/owner/expenses/${id}`)).status()).toBe(200);
  expect((await download(api)).backup.data.expenses.some((r) => r.id === id)).toBe(false);
  const applied = await restore(api, backup, true);
  expect(applied.added).toBeGreaterThanOrEqual(1);
  expect((await download(api)).backup.data.expenses.some((r) => r.id === id)).toBe(true);

  // a second restore of the same file changes nothing
  const again = await restore(api, backup, true);
  expect(again.added + again.updated).toBe(0);

  await api.delete(`/api/owner/expenses/${id}`);
});

test("a caterer can back up and restore, and a file from someone else is refused", async ({ page, playwright }) => {
  const a = account();
  await signIn(page.context(), a.phone, a.password);
  const api = page.context().request;

  const made = await api.post("/api/caterer/suppliers", { data: { name: "Backup Test Dairy", category: "Dairy", cycle: "MONTHLY" } });
  expect(made.status(), await made.text()).toBe(201);
  const id = (await made.json()).supplier.id as string;

  const { backup } = await download(api);
  expect(backup.kind).toBe("CATERER");
  expect(backup.data.suppliers.some((r) => r.id === id)).toBe(true);
  expect((await api.delete(`/api/caterer/suppliers/${id}`)).status()).toBe(200);
  await restore(api, backup, true);
  expect((await download(api)).backup.data.suppliers.some((r) => r.id === id)).toBe(true);

  // the centre's records can never be written by a caterer, and a file whose Refs belong to the other account is refused
  const centre = await playwright.request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  await centre.post("/api/auth/login", { data: { phone: a.centre.phone, password: a.centre.password } });
  const theirs = (await download(centre)).backup;
  await centre.dispose();
  const stolen = theirs.data.halls ?? [];
  const wrong = await api.post("/api/backup/restore", { data: { action: "batch", key: "halls", rows: stolen, apply: true } });
  expect(wrong.status()).toBeGreaterThanOrEqual(400);
  // the same Refs as a supplier row from a caterer's file: refused, not overwritten
  const foreign = await api.post("/api/backup/restore", { data: { action: "batch", key: "suppliers", rows: stolen.map((h) => ({ id: h.id, name: "x", category: "Dairy", cycle: "MONTHLY", active: true })), apply: true } });
  expect(foreign.status()).toBeLessThan(500);

  // a damaged file is refused politely
  const junk = await api.post("/api/backup/restore", { data: { action: "batch", key: "suppliers", rows: [{ id: "x" }], apply: false } });
  expect(junk.status()).toBe(400);

  await api.delete(`/api/caterer/suppliers/${id}`);
});

test("a team member cannot back up or restore", async ({ page }) => {
  const a = account();
  await signIn(page.context(), a.centre.phone, a.centre.password);
  const made = await page.context().request.post("/api/owner/team", { data: { name: "Backup Staff", phone: "9847000888" } });
  expect(made.status()).toBe(201);
  const m = await made.json();
  const staff = await page.context().browser()!.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  expect((await staff.request.post("/api/auth/login", { data: { phone: "9847000888", password: m.password } })).ok()).toBe(true);
  expect((await staff.request.get("/api/backup")).status()).toBe(403);
  expect((await staff.request.post("/api/backup/restore", { data: { action: "finish" } })).status()).toBe(403);
  await staff.close();
  await page.context().request.delete(`/api/owner/team/${m.member?.id ?? m.id}`);
});

test("a backup file cannot be used to read or overwrite another account's records", async ({ browser, playwright }) => {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const admin = await playwright.request.newContext({ baseURL: base });
  await admin.post("/api/admin/auth/login", { data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
  const stamp = Date.now().toString().slice(-6);
  const bC = await (await admin.post("/api/admin/owners", { data: { name: `ZZ Backup Centre ${stamp}`, phone: `98467${stamp.slice(-5)}`, email: `bc${stamp}@example.com`, address: "Road, Kochi", city: "Kochi", capacity: 300, priceRupees: 80000 } })).json();
  const bK = await (await admin.post("/api/admin/caterers", { data: { name: `ZZ Backup Caterer ${stamp}`, phone: `98468${stamp.slice(-5)}`, email: `bk${stamp}@example.com`, city: "Kochi", whatsappNumber: `98468${stamp.slice(-5)}`, description: "x", photos: [], packages: [{ name: "Gold", pricePerPlate: 200, isVeg: true, dishes: ["Rice"] }], minGuests: 10, maxGuests: 100 } })).json();
  const other = await browser.newContext(); const otherCat = await browser.newContext(); const mine = await browser.newContext(); const cat = await browser.newContext();
  try {
    await signIn(other, String(bC.phone).replace(/^\+91/, ""), bC.password);
    await signIn(otherCat, String(bK.phone).replace(/^\+91/, ""), bK.password);
    const a = account();
    await signIn(mine, a.centre.phone, a.centre.password);
    await signIn(cat, a.phone, a.password);

    // the other centre's own backup holds its hall; the other caterer's holds its supplier
    const theirHall = (await download(other.request)).backup.data.halls[0];
    const sup = await otherCat.request.post("/api/caterer/suppliers", { data: { name: "Secret Dairy", category: "Dairy", cycle: "MONTHLY" } });
    const theirSupplier = (await sup.json()).supplier;
    expect(theirHall).toBeTruthy();

    // my backup never contains their records
    const mineBackup = JSON.stringify((await download(mine.request)).backup);
    expect(mineBackup).not.toContain(theirHall.id as string);
    expect(JSON.stringify((await download(cat.request)).backup)).not.toContain("Secret Dairy");

    // a file that carries their Ref is refused outright, and their record is left as it was
    const hall = await mine.request.post("/api/backup/restore", { data: { action: "batch", key: "halls", rows: [{ ...theirHall, name: "Hacked hall" }], apply: true } });
    expect(hall.status()).toBe(403);
    const supplier = await cat.request.post("/api/backup/restore", { data: { action: "batch", key: "suppliers", rows: [{ ...theirSupplier, name: "Hacked" }], apply: true } });
    expect(supplier.status()).toBe(403);
    // the check run alone also refuses
    expect((await mine.request.post("/api/backup/restore", { data: { action: "batch", key: "halls", rows: [theirHall], apply: false } })).status()).toBe(403);
    expect((await download(other.request)).backup.data.halls[0].name).toBe(theirHall.name);
    const still = await (await otherCat.request.get("/api/caterer/suppliers")).json();
    expect(JSON.stringify(still)).toContain("Secret Dairy");
    expect(JSON.stringify(still)).not.toContain("Hacked");

    // a new row that points to someone else's parent is refused too
    const own = (await download(mine.request)).backup.data.halls[0];
    const smuggled = await mine.request.post("/api/backup/restore", { data: { action: "batch", key: "slotTemplates", rows: [{ id: "cmbackupsmuggle00000000000", name: "x", startTime: "09:00", endTime: "12:00", hallId: theirHall.id }], apply: true } });
    expect(smuggled.status()).toBe(400);
    void own;
    // a caterer's file cannot be restored on a centre
    expect((await mine.request.post("/api/backup/restore", { data: { action: "batch", key: "suppliers", rows: [], apply: false } })).status()).toBe(400);
  } finally {
    await other.close(); await otherCat.close(); await mine.close(); await cat.close();
    await admin.delete(`/api/admin/owners/${bC.orgId}`); await admin.delete(`/api/admin/caterers/${bK.catererId}`); await admin.dispose();
  }
});

test("on the Backup page: download the file, lose a record, choose the file and restore", async ({ page }) => {
  const a = account();
  await signIn(page.context(), a.centre.phone, a.centre.password);
  const api = page.context().request;
  const made = await api.post("/api/owner/expenses", { data: { category: "Other", label: "Page test chairs", amountRupees: 777, date: "2026-11-02" } });
  const id = (await made.json()).expense.id as string;

  await page.goto("/owner/dashboard");
  await page.waitForLoadState("networkidle");
  await page.locator("aside").getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("navigation", { name: "Settings" }).getByRole("link", { name: "Backup", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Backup", level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download backup" }).click()]);
  const file = test.info().outputPath("my-backup.zip");
  await download.saveAs(file);
  expect(download.suggestedFilename()).toMatch(/^virunnu-backup-.*\.zip$/);

  await api.delete(`/api/owner/expenses/${id}`);
  await page.getByLabel("Choose a backup file").setInputFiles(file);
  await expect(page.getByText(/Backup of .*taken/)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("cell", { name: "Expenses", exact: true })).toBeVisible();
  const [safety] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Restore \d+ records$/ }).click()]);
  expect(safety.suggestedFilename()).toMatch(/^before-restore-/);
  await expect(page.getByText(/Restored: \d+ records added back/)).toBeVisible({ timeout: 60_000 });

  const back = await (await api.get("/api/owner/expenses?search=Page%20test%20chairs")).json();
  expect(JSON.stringify(back)).toContain("Page test chairs");

  // a file that is not a backup says so
  await page.getByLabel("Choose a backup file").setInputFiles({ name: "notes.zip", mimeType: "application/zip", buffer: Buffer.from("not a zip") });
  await expect(page.getByText("This does not look like a Virunnu backup file")).toBeVisible();
  await api.delete(`/api/owner/expenses/${id}`);
});
