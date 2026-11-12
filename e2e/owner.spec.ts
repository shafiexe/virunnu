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
