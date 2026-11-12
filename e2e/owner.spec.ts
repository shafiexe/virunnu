import { expect, test } from "@playwright/test";
import { account, signIn } from "./helpers";

test.describe("convention centre owner", () => {
  test("+ New starts a booking, and quick-find jumps to the customer", async ({ page }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    await page.goto("/owner/dashboard");

    await page.getByRole("button", { name: "New", exact: true }).click();
    await page.getByRole("link", { name: /New booking/ }).click();
    await expect(page.getByText("Paste the customer's message")).toBeVisible();

    const date = new Date(Date.now() + 20 * 86400_000).toLocaleDateString("en-CA");
    await page.locator('input[type="date"]').fill(date);
    await page.locator("select").first().selectOption({ index: 1 });
    await page.getByPlaceholder("e.g. Anand Krishnan").fill("Browser Rahim Customer");
    await page.getByPlaceholder("9876543210").fill("9000000456");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText("Paste the customer's message")).toBeHidden();

    // search by name, then by the phone number
    await page.keyboard.press("/");
    await page.getByPlaceholder("Customer name or phone…").fill("Rahim Customer");
    await expect(page.locator("li").getByText("Customer", { exact: true })).toBeVisible();
    await page.getByPlaceholder("Customer name or phone…").press("Enter");
    await expect(page).toHaveURL(/\/owner\/customers\//);
  });

  test("a pasted message fills the booking form", async ({ page }) => {
    test.skip(!process.env.ANTHROPIC_API_KEY, "needs ANTHROPIC_API_KEY");
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    await page.goto("/owner/calendar?new=1");
    await page.getByPlaceholder(/e.g. Rahim/).fill("Suresh 98470 55555 wants the evening slot, wedding, advance 25000");
    await page.getByRole("button", { name: "Fill the form" }).click();
    await expect(page.getByPlaceholder("9876543210")).toHaveValue("9847055555", { timeout: 30_000 });
    await expect(page.getByPlaceholder("e.g. Anand Krishnan")).toHaveValue(/Suresh/);
    await expect(page.locator(`input[type="number"][placeholder="0"]`)).toHaveValue("25000");
  });
});

test.describe("enquiries tab", () => {
  test("a Request to Book appears under Enquiries, not on the dashboard", async ({ browser }) => {
    const { centre } = account();
    const phoneCtx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
    const c = await phoneCtx.newPage();
    await c.goto(`/venues/${centre.venueId}`);
    const day = new Date(Date.now() + 40 * 86400_000);
    // the calendar shows the current month; go forward until the chosen day is on screen
    const label = day.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    for (let i = 0; i < 3 && !(await c.getByText(label, { exact: true }).first().isVisible()); i++) await c.getByRole("button", { name: "Next month" }).first().click();
    await c.getByRole("button", { name: new RegExp(`^${day.getDate()}\\b`) }).first().click();
    await c.getByText("Morning").first().click();
    await c.getByRole("button", { name: /Request to Book/ }).click();
    await c.getByPlaceholder("Mohammed Shafi").fill("Browser Requester");
    await c.getByPlaceholder("+91 98765 43210").fill("9000000321");
    await c.getByRole("button", { name: /Send booking request/ }).click();
    await expect(c.getByText(/request/i).first()).toBeVisible();
    await phoneCtx.close();

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await signIn(ctx, centre.phone, centre.password);
    const o = await ctx.newPage();
    await o.goto("/owner/dashboard");
    await expect(o.getByText("Requests to book")).toHaveCount(0);
    await o.getByRole("link", { name: /Enquiries/ }).first().click();
    await expect(o).toHaveURL(/\/owner\/enquiries/);
    await expect(o.getByText("Requests to book")).toBeVisible();
    await expect(o.getByText("Browser Requester")).toBeVisible();
    await ctx.close();
  });
});
