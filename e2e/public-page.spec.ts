import { expect, test } from "@playwright/test";
import { account } from "./helpers";

test.describe("public caterer page", () => {
  test("phone: price line, gallery and the contact bar", async ({ browser }) => {
    const a = account();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(`/caterers/${a.catererId}`);
    await expect(page.getByText(/From ₹220/)).toBeVisible();
    await expect(page.getByText("50–1,000 guests")).toBeVisible();
    await expect(page.getByRole("link", { name: "Call", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Enquire" }).click();
    await expect(page.getByLabel(/Your name/).or(page.getByPlaceholder("Full name"))).toBeVisible();
    await page.screenshot({ path: "e2e/screens/caterer-public-mobile.png" });
    await context.close();
  });
});
