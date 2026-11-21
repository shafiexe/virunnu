import { expect, test, type Locator, type Page } from "@playwright/test";
import { account, signIn } from "./helpers";

test.describe.configure({ timeout: 180_000 });

// A button is really usable on a phone when it is on the screen and nothing (like the bottom menu) is drawn over its middle.
async function reachable(page: Page, button: Locator, what: string) {
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  expect(box, `${what} has a box`).not.toBeNull();
  const vp = page.viewportSize()!;
  expect(box!.y + box!.height, `${what} is above the bottom of the screen`).toBeLessThanOrEqual(vp.height);
  const covered = await button.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !(hit && (el === hit || el.contains(hit)));
  });
  expect(covered, `${what} is covered by something`).toBe(false);
}

test("on a phone, a dialog's bottom buttons are never hidden behind the bottom menu", async ({ browser }) => {
  const c = account().centre;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
  await signIn(ctx, c.phone, c.password);
  const page = await ctx.newPage();
  await page.goto("/owner/calendar");
  await expect(page.locator("nav.fixed.bottom-0")).toBeVisible();      // the bottom menu is there

  // Import from diary
  await page.getByRole("button", { name: "Import from diary" }).click();
  const diary = page.getByRole("dialog", { name: /Import bookings from your diary/ });
  await reachable(page, diary.getByRole("button", { name: /^Read/ }), "the diary's Read button");
  await diary.getByRole("button", { name: "Close" }).click();

  // pick a day, then Block several days
  const day = page.getByRole("button", { name: /^25\b/ }).first();
  await day.click();
  await page.getByRole("button", { name: "Block several days" }).click();
  const block = page.locator("div.fixed.inset-0").last();
  await reachable(page, block.locator("button.w-full").last(), "the Block several days dialog's button");
  await block.getByRole("button", { name: "Close" }).click();

  // Add booking
  await page.getByRole("button", { name: "Add booking" }).first().click();
  const add = page.locator("div.fixed.inset-0").filter({ hasText: "Add phone booking" });
  await expect(add).toBeVisible();
  await reachable(page, add.getByRole("button", { name: /Confirm booking|Creating/ }), "the Confirm booking button");
  await ctx.close();
});

test("the invoice buttons sit on one line each and fit a phone", async ({ browser }) => {
  const c = account().centre;
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });
  await signIn(ctx, c.phone, c.password);
  const api = ctx.request;
  const d = new Date(Date.now() + 120 * 86400_000);
  const cal = await (await api.get(`/api/owner/calendar?venueId=${c.venueId}&year=${d.getFullYear()}&month=${d.getMonth() + 1}`)).json();
  const hall = cal.venue.halls[0];
  const made = await api.post("/api/owner/bookings", { data: { venueId: c.venueId, hallId: hall.id, templateId: hall.slotTemplates[0].id, date: d.toLocaleDateString("en-CA"), customerPhone: `96${Date.now().toString().slice(-8)}`, customerName: "Phone Invoice", amountRupees: 30000 } });
  const bookingId = (await made.json()).booking.id as string;
  const page = await ctx.newPage();
  await page.goto(`/owner/bookings/${bookingId}/invoice`);
  for (const name of ["Download PDF", "Print"]) {
    const b = page.getByRole("link", { name }).or(page.getByRole("button", { name })).first();
    await expect(b).toBeVisible();
    const box = (await b.boundingBox())!;
    expect(box.height, `${name} is one line tall`).toBeLessThan(56);
    expect(box.x + box.width, `${name} fits the screen`).toBeLessThanOrEqual(360);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await ctx.close();
});
