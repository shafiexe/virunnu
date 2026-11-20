import { expect, test } from "@playwright/test";
import { account, signIn } from "./helpers";

test.describe.configure({ timeout: 180_000 });

// A booking list and a diary import, as the owner sees them. The AI reading is replaced by a fixed answer, so the test costs nothing.
test("the table lists the month's bookings by date, and the diary import asks before it saves", async ({ browser }) => {
  const centre = account().centre;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await signIn(ctx, centre.phone, centre.password);
  const api = ctx.request;
  const page = await ctx.newPage();

  // a month with something in it: two bookings, one with a balance due
  const now = new Date();
  const stamp = Date.now().toString().slice(-6);
  const ph = { anwar: `97${stamp}01`, joseph: `97${stamp}02`, mary: `97${stamp}03`, fresh: `97${stamp}04` };
  const first = (n: number) => new Date(now.getFullYear(), now.getMonth(), n).toLocaleDateString("en-CA");
  const cal = await (await api.get(`/api/owner/calendar?venueId=${centre.venueId}&year=${now.getFullYear()}&month=${now.getMonth() + 1}`)).json();
  const hall = cal.venue.halls[0];
  const [t0, t1] = [hall.slotTemplates[0], hall.slotTemplates[1]];
  const mk = (date: string, templateId: string, name: string, phone: string, amountRupees: number, advanceRupees?: number) =>
    api.post("/api/owner/bookings", { data: { venueId: centre.venueId, hallId: hall.id, templateId, date, customerPhone: phone, customerName: name, amountRupees, advanceRupees } });
  expect((await mk(first(3), t0.id, "Table Anwar", ph.anwar, 50000, 10000)).status()).toBe(201);
  expect((await mk(first(3), t1.id, "Table Joseph", ph.joseph, 30000)).status()).toBe(201);
  expect((await mk(first(9), t0.id, "Table Mary", ph.mary, 20000, 20000)).status()).toBe(201);

  await page.goto("/owner/calendar");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.getByRole("columnheader", { name: "Phone" })).toBeVisible();
  const row = (name: string) => page.getByRole("row", { name: new RegExp(name) });
  await expect(row("Table Anwar")).toContainText(ph.anwar);
  await expect(row("Table Anwar")).toContainText("Advance paid");
  await expect(row("Table Anwar")).toContainText("₹40,000");           // what is still due
  await expect(row("Table Mary")).toContainText("Confirmed");
  await expect(page.getByText(/3 bookings/)).toBeVisible();
  // dates are in order, with the slot named
  const text = await page.locator("table").innerText();
  expect(text.indexOf("Table Anwar")).toBeLessThan(text.indexOf("Table Mary"));
  expect(text).toContain(t0.name);
  // search and filter
  await page.getByLabel("Search bookings").fill("joseph");
  await expect(row("Table Joseph")).toBeVisible();
  await expect(row("Table Anwar")).toHaveCount(0);
  await page.getByLabel("Search bookings").fill(ph.mary);
  await expect(row("Table Mary")).toBeVisible();
  await page.getByLabel("Search bookings").fill("");
  await page.getByRole("button", { name: "Advance paid" }).click();
  await expect(row("Table Mary")).toHaveCount(0);
  await expect(row("Table Anwar")).toBeVisible();
  await page.getByRole("button", { name: "All", exact: true }).click();
  // a date's own page
  await page.getByRole("button", { name: "Open day" }).first().click();
  await expect(page.getByRole("button", { name: "Calendar", exact: true })).toHaveAttribute("aria-pressed", "true");

  // ── the diary: the reading is replaced by a fixed answer
  const target = new Date(now.getFullYear() + 1, 4, 14).toLocaleDateString("en-CA");   // next May, so the year is "assumed" from the answer below
  await page.route("**/api/owner/diary-read", (route) => route.fulfill({ json: { entries: [
    { date: first(3), yearAssumed: false, templateId: t0.id, slotAssumed: false, name: "Diary Clash", phone: null, totalRupees: 25000, advanceRupees: null },   // already booked above
    { date: target, yearAssumed: true, templateId: t0.id, slotAssumed: true, name: "Diary Fresh", phone: ph.fresh, totalRupees: null, advanceRupees: 5000 },
    { date: null, yearAssumed: true, templateId: t0.id, slotAssumed: true, name: "Diary Unclear", phone: null, totalRupees: 15000, advanceRupees: null },        // no readable date
  ] } }));
  let saved = 0;
  await page.route("**/api/owner/bookings/bulk", async (route) => { if (route.request().postDataJSON().apply) saved++; await route.continue(); });

  await page.getByRole("button", { name: "Import from diary" }).click();
  const dialog = page.getByRole("dialog", { name: /Import bookings from your diary/ });
  await expect(dialog.getByText("Step 1 of 3")).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^Read/ })).toBeDisabled();
  await dialog.getByLabel("Choose diary photos").setInputFiles(["e2e/fixtures/bill.png", "e2e/fixtures/hall.jpg"]);
  await expect(dialog.getByAltText("Diary page 2")).toBeVisible();
  await dialog.getByRole("button", { name: "Read 2 pages" }).click();

  // the list: every entry, with what was assumed and what clashes
  await expect(dialog.getByText("Step 3 of 3")).toBeVisible();
  await expect(dialog.getByText(/6 entries found/)).toBeVisible();      // the same answer comes back for both pages
  const entries = dialog.locator("input[aria-label='Name']");
  await expect(entries).toHaveCount(6);
  await expect(dialog.getByText("That slot is already booked or held").first()).toBeVisible();
  await expect(dialog.getByText(/Amount not written/).first()).toBeVisible();
  await expect(dialog.getByText(/Year not written/).first()).toBeVisible();
  await expect(dialog.getByText("Needs a date, a name or phone, and an amount").first()).toBeVisible();
  // a row that cannot be added cannot be ticked
  await expect(dialog.getByRole("checkbox", { name: "Add this booking" }).first()).toBeDisabled();
  // the second page repeats page one's entry: the repeated date and slot is caught
  await expect(dialog.getByText("Another row in this list uses the same date and slot").first()).toBeVisible();

  // fix the unclear row by giving it a date, remove the duplicates, and the list is ready
  const at = await entries.evaluateAll((els) => els.findIndex((e) => (e as HTMLInputElement).value === "Diary Unclear"));
  const unclear = entries.nth(at).locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await unclear.getByLabel("Date").fill(first(20));
  await expect(unclear.getByText("Ready")).toBeVisible();
  while (await dialog.getByLabel("Remove this row").count() > 3) await dialog.getByLabel("Remove this row").last().click();

  // asks before saving: nothing was saved yet
  await dialog.getByRole("button", { name: /^Review \d+ booking/ }).click();
  await expect(dialog.getByRole("heading", { name: /Add 2 bookings\?/ })).toBeVisible();
  await expect(dialog.getByText("No messages or emails are sent to these customers.")).toBeVisible();
  expect(saved).toBe(0);
  await dialog.getByRole("button", { name: "Go back" }).click();
  await expect(dialog.getByText("Step 3 of 3")).toBeVisible();
  await dialog.getByRole("button", { name: /^Review \d+ booking/ }).click();
  await dialog.getByRole("button", { name: /^Yes, add 2 bookings/ }).click();
  await expect(dialog.getByRole("heading", { name: "Added 2 bookings" })).toBeVisible();
  expect(saved).toBe(1);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toHaveCount(0);

  // they are on the calendar (this month's table)
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(row("Diary Unclear")).toContainText("₹15,000");
  const list = await (await api.get(`/api/owner/bookings?search=Diary&pageSize=50`)).json();
  expect(list.data.map((b: { user?: { name?: string }; guestName?: string }) => b.user?.name ?? b.guestName).sort()).toEqual(["Diary Fresh", "Diary Unclear"]);
  await ctx.close();
});

test("closing the diary import in the middle asks first", async ({ browser }) => {
  const centre = account().centre;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await signIn(ctx, centre.phone, centre.password);
  const page = await ctx.newPage();
  await page.route("**/api/owner/diary-read", (route) => route.fulfill({ json: { entries: [{ date: "2031-01-05", yearAssumed: false, templateId: null, slotAssumed: true, name: "Keep Me", phone: null, totalRupees: 1000, advanceRupees: null }] } }));
  await page.goto("/owner/calendar");
  await page.getByRole("button", { name: "Import from diary" }).click();
  const dialog = page.getByRole("dialog", { name: /Import bookings from your diary/ });
  await dialog.getByLabel("Choose diary photos").setInputFiles("e2e/fixtures/bill.png");
  await dialog.getByRole("button", { name: "Read 1 page" }).click();
  await expect(dialog.locator("input[aria-label='Name']")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Throw away this list?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep working" }).click();
  await expect(dialog.locator("input[aria-label='Name']")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Yes, discard" }).click();
  await expect(dialog).toHaveCount(0);
  await ctx.close();
});
