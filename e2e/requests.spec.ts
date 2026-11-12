import { expect, test, type Browser } from "@playwright/test";
import { account, signIn } from "./helpers";

// A customer, logged out, asks to book a day `ahead` days from now
async function request(browser: Browser, name: string, phone: string, ahead: number) {
  const { centre } = account();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const c = await ctx.newPage();
  await c.goto(`/venues/${centre.venueId}`);
  const day = new Date(Date.now() + ahead * 86400_000);
  const label = day.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  for (let i = 0; i < 4 && !(await c.getByText(label, { exact: true }).first().isVisible()); i++) await c.getByRole("button", { name: "Next month" }).first().click();
  await c.getByRole("button", { name: new RegExp(`^${day.getDate()}\\b`) }).first().click();
  await c.getByText("Morning").first().click();
  await c.getByRole("button", { name: /Request to Book/ }).click();
  await c.getByPlaceholder("Mohammed Shafi").fill(name);
  await c.getByPlaceholder("+91 98765 43210").fill(phone);
  await c.getByRole("button", { name: /Send booking request/ }).click();
  await expect(c.getByText(/request/i).first()).toBeVisible();
  await ctx.close();
}

test.describe("requests to book", () => {
  test("a waiting request is in Enquiries only; rejecting keeps it there, approving moves it to Bookings and Customers", async ({ browser }) => {
    const { centre } = account();
    await request(browser, "Req Rejected Person", "9000000901", 52);
    await request(browser, "Req Approved Person", "9000000902", 53);

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await signIn(ctx, centre.phone, centre.password);
    const o = await ctx.newPage();

    // waiting: not a booking and not a customer, but Bookings points to Enquiries
    await o.goto("/owner/bookings");
    await expect(o.getByText("Req Rejected Person")).toHaveCount(0);
    await expect(o.getByText("Req Approved Person")).toHaveCount(0);
    await expect(o.getByText(/requests? to book waiting for you/)).toBeVisible();
    await o.getByRole("link", { name: /Open Enquiries/ }).click();
    await expect(o).toHaveURL(/\/owner\/enquiries/);
    await expect(o.getByText("Req Rejected Person")).toBeVisible();
    await o.goto("/owner/customers");
    await expect(o.getByText("Req Rejected Person")).toHaveCount(0);

    // reject one with a reason
    await o.goto("/owner/enquiries");
    const rejectCard = o.locator("div.px-5.py-4").filter({ hasText: "Req Rejected Person" });
    await rejectCard.getByRole("button", { name: "Reject", exact: true }).click();
    await o.getByPlaceholder("Reason (optional)").fill("Hall is under repair that week");
    await o.getByRole("button", { name: "Confirm reject" }).click();
    await expect(o.getByText("Req Rejected Person")).toHaveCount(0);

    // it is kept under Past requests, with the reason, and still not in Bookings or Customers
    await o.goto("/owner/enquiries?tab=past");
    await expect(o.getByText("Req Rejected Person")).toBeVisible();
    await expect(o.getByText("Rejected", { exact: true })).toBeVisible();
    await expect(o.getByText("Hall is under repair that week")).toBeVisible();
    await o.goto("/owner/bookings");
    await expect(o.getByText("Req Rejected Person")).toHaveCount(0);
    await o.goto("/owner/customers");
    await expect(o.getByText("Req Rejected Person")).toHaveCount(0);

    // approve the other: it becomes a booking and a customer
    await o.goto("/owner/enquiries");
    await o.locator("div.px-5.py-4").filter({ hasText: "Req Approved Person" }).getByRole("button", { name: "Approve", exact: true }).click();
    await expect(o.getByText("Req Approved Person")).toHaveCount(0);
    await o.goto("/owner/bookings");
    await expect(o.getByText("Req Approved Person").first()).toBeVisible();
    await o.goto("/owner/customers");
    await expect(o.getByText("Req Approved Person").first()).toBeVisible();
    await ctx.close();
  });

  test("a rejected request frees the date again", async ({ browser }) => {
    const { centre } = account();
    await request(browser, "Req Freed Person", "9000000903", 55);
    const ctx = await browser.newContext();
    await signIn(ctx, centre.phone, centre.password);
    const o = await ctx.newPage();
    await o.goto("/owner/enquiries");
    await o.locator("div.px-5.py-4").filter({ hasText: "Req Freed Person" }).getByRole("button", { name: "Reject", exact: true }).click();
    await o.getByRole("button", { name: "Confirm reject" }).click();
    await expect(o.getByText("Req Freed Person")).toHaveCount(0);

    // the same day can be requested again straight away
    await request(browser, "Req Second Person", "9000000904", 55);
    await o.goto("/owner/enquiries");
    await expect(o.getByText("Req Second Person")).toBeVisible();
    await ctx.close();
  });
});
