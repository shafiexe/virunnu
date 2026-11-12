import { expect, test } from "@playwright/test";
import { account, post, signIn } from "./helpers";

test.describe("phone defaults", () => {
  test("a phone starts on cards and a folded checklist; a desktop does not", async ({ browser }) => {
    const { centre } = account();
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await signIn(phone, centre.phone, centre.password);
    const p = await phone.newPage();
    for (const path of ["/owner/bookings", "/owner/customers"]) {
      await p.goto(path);
      await expect(p.getByRole("button", { name: "Card view" })).toBeVisible();
      await expect(p.locator("table")).toHaveCount(0);
    }
    await p.goto("/owner/dashboard");
    await expect(p.getByText("Get set up")).toBeVisible();
    await expect(p.getByText(/It prints on every invoice/)).toBeHidden();
    await p.getByRole("button", { name: "Expand" }).click();
    await expect(p.getByText(/It prints on every invoice/)).toBeVisible();
    await phone.close();

    const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await signIn(desk, centre.phone, centre.password);
    const d = await desk.newPage();
    await d.goto("/owner/bookings");
    await expect(d.locator("table").first()).toBeVisible();
    await d.goto("/owner/dashboard");
    await expect(d.getByText(/It prints on every invoice/)).toBeVisible();
    await desk.close();
  });
});

test.describe("caterer receipts", () => {
  test("a payment on an invoice has a customer link that opens without signing in", async ({ page, browser }) => {
    const a = account();
    await signIn(page.context(), a.phone, a.password);
    await post(page, "/api/caterer/items/starter");
    await page.goto("/caterer/orders/new");
    await page.getByPlaceholder("98470 00000").fill("9000000333");
    await page.getByPlaceholder("e.g. Shafi").fill("Receipt Customer");
    await page.getByLabel("Find an item").fill("beef biriyani 5");
    await page.getByLabel("Find an item").press("Enter");
    await expect(page.getByText("Beef biriyani").first()).toBeVisible();
    await page.getByRole("button", { name: "Save order" }).click();
    await expect(page).toHaveURL(/\/caterer\/orders\/(?!new)[a-z0-9]+$/);
    const orderUrl = page.url();

    // take a part payment on the invoice
    await page.getByRole("button", { name: /Payment received/ }).first().click();
    await page.getByRole("button", { name: "Confirm payment received" }).click();
    await expect(page.getByRole("link", { name: "Receipt", exact: true })).toBeVisible();
    await page.goto(orderUrl);

    // Send opens WhatsApp with the receipt link in the message
    const popup = page.waitForEvent("popup");
    await page.getByRole("button", { name: /receipt on WhatsApp/ }).first().click();
    const wa = decodeURIComponent((await popup).url());
    expect(wa).toContain("919000000333");
    expect(wa).toMatch(/\/r\/[a-z0-9]+/);

    // the customer's link shows that one receipt and no phone number
    const href = await page.getByRole("link", { name: "Receipt", exact: true }).first().getAttribute("href");
    const anon = await browser.newContext();
    const pub = await anon.newPage();
    await pub.goto(href!);
    await expect(pub.getByText("Receipt Customer")).toBeVisible();
    await expect(pub.getByText(/ZZ E2E Caterers/).first()).toBeVisible();
    await expect(pub.getByText("Received so far")).toBeVisible();
    await expect(pub.getByText("9000000333")).toHaveCount(0);
    await anon.close();
  });
});

test.describe("caterer on a hall booking", () => {
  test("link a caterer, send them the booking, and they see it in their Enquiries", async ({ browser }) => {
    const a = account();
    const { centre } = a;
    const owner = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await signIn(owner, centre.phone, centre.password);
    const o = await owner.newPage();

    await o.goto("/owner/calendar?new=1");
    await o.locator('form input[type="date"]').first().fill(new Date(Date.now() + 61 * 86400_000).toLocaleDateString("en-CA"));
    await o.locator("form select").first().selectOption({ index: 1 });
    await o.getByPlaceholder("e.g. Anand Krishnan").fill("Catering Link Customer");
    await o.getByPlaceholder("9876543210").fill("9000000444");
    await o.getByRole("button", { name: "Confirm booking" }).click();
    await expect(o.getByText("Paste the customer's message")).toBeHidden();
    await o.goto("/owner/bookings");
    await o.getByRole("row", { name: /Catering Link Customer/ }).getByRole("link", { name: "Details", exact: true }).click();

    // find the caterer by name and link it
    await o.getByLabel("Search a caterer").fill("ZZ E2E Caterers");
    await o.getByRole("button", { name: /ZZ E2E Caterers/ }).click();
    await expect(o.getByRole("link", { name: /ZZ E2E Caterers/ })).toBeVisible();

    // sharing the customer's phone asks first
    await o.getByRole("button", { name: /Send this booking to/ }).click();
    await expect(o.getByText(/customer's name and phone number/)).toBeVisible();
    await o.getByRole("button", { name: "Send", exact: true }).click();
    await expect(o.getByText(/Sent\. Waiting for them/)).toBeVisible();

    // the caterer finds it among their enquiries, with the details
    const cat = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await signIn(cat, a.phone, a.password);
    const c = await cat.newPage();
    await c.goto("/caterer/enquiries");
    await expect(c.getByText("Catering Link Customer")).toBeVisible();
    await expect(c.getByText(/Hall booking at ZZ E2E Centre/)).toBeVisible();
    await owner.close(); await cat.close();
  });
});

test.describe("bill photo", () => {
  test("a photo of a bill fills in the expense form", async ({ page }) => {
    test.skip(!process.env.ANTHROPIC_API_KEY, "needs ANTHROPIC_API_KEY");
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    await page.goto("/owner/expenses?add=1");
    await page.getByLabel("Photo of the bill").setInputFiles("e2e/fixtures/bill.png");
    await expect(page.getByText(/Read from the bill/)).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('input[inputmode="decimal"], input[type="number"]').filter({ hasNot: page.locator("[hidden]") }).first()).toBeVisible();
    // the amount, the date and a name came from the bill
    await expect(page.locator("form")).toContainText(/electric|kseb/i);
    const values = await page.locator("form input").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(values.some((v) => Number(v) === 4820)).toBeTruthy();
    expect(values).toContain("2026-11-03");
  });
});
