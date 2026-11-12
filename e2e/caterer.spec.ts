import { expect, test } from "@playwright/test";
import { account, post, signIn } from "./helpers";

test.describe("catering team", () => {
  test("signs in with phone and password and sees the dashboard", async ({ page }) => {
    const a = account();
    await page.goto("/login");
    await page.getByPlaceholder("9876543210").first().fill(a.phone);
    await page.getByPlaceholder("Your password").fill(a.password);
    await page.getByRole("button", { name: /Sign in/ }).click();
    await expect(page).toHaveURL(/\/caterer\//);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Get set up")).toBeVisible();
  });

  test("creates an order with the item search, then records the payment from the list", async ({ page }) => {
    const a = account();
    await signIn(page.context(), a.phone, a.password);
    await post(page, "/api/caterer/items/starter");

    await page.goto("/caterer/orders/new");
    await page.getByPlaceholder("98470 00000").fill("9000000123");
    await page.getByPlaceholder("e.g. Shafi").fill("Browser Test Customer");
    // type a name and a quantity in the item search, then Enter
    await page.getByLabel("Find an item").fill("beef biriyani 5");
    await page.getByLabel("Find an item").press("Enter");
    await expect(page.getByText("Beef biriyani").first()).toBeVisible();
    await page.getByRole("button", { name: "Save order" }).click();
    await expect(page).toHaveURL(/\/caterer\/orders\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: /Browser Test Customer/ })).toBeVisible();

    // receive the full balance from the Orders list
    await page.goto("/caterer/orders");
    const row = page.getByRole("row", { name: /Browser Test Customer/ });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /Receive/ }).click();
    await page.getByRole("button", { name: "Save payment" }).click();
    await expect(row.getByText("Closed")).toBeVisible();
  });

  test("a team member only reaches the pages the owner left open", async ({ page }) => {
    const a = account();
    await signIn(page.context(), a.phone, a.password);
    const res = await post(page, "/api/caterer/team", { name: "Browser Rahim", phone: "9847000272" });
    const created = await res.json();
    expect(res.status(), JSON.stringify(created)).toBe(201);
    await page.context().request.patch(`/api/caterer/team/${created.member.id}`, { data: { deny: ["reports", "orders.quotes"] } });
    await page.context().clearCookies();
    await signIn(page.context(), "9847000272", created.password);
    await page.goto("/caterer/orders");
    await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
    await page.goto("/caterer/reports");
    await expect(page.getByText("You don't have access to this page")).toBeVisible();
    await page.goto("/caterer/quotes");
    await expect(page.getByText("You don't have access to this page")).toBeVisible();
  });
});
