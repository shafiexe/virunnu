import { expect, test } from "@playwright/test";
import { account, signIn } from "./helpers";

test.describe("booking payments", () => {
  test("record payments until paid, check the receipt, remove one", async ({ page, browser }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);

    // a booking of ₹1,00,000 with ₹25,000 handed over
    await page.goto("/owner/calendar?new=1");
    await page.locator('form input[type="date"]').first().fill(new Date(Date.now() + 33 * 86400_000).toLocaleDateString("en-CA"));
    await page.locator("form select").first().selectOption({ index: 1 });
    await page.getByPlaceholder("e.g. Anand Krishnan").fill("Ledger Customer");
    await page.getByPlaceholder("9876543210").fill("9000000654");
    await page.locator('input[type="number"][placeholder="0"]').fill("25000");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText("Paste the customer's message")).toBeHidden();

    await page.goto("/owner/bookings");
    await page.getByRole("link", { name: "Details", exact: true }).first().click();
    await expect(page).toHaveURL(/\/owner\/bookings\/[a-z0-9]+$/);
    const bookingUrl = page.url();

    // the advance is already the first payment
    await expect(page.getByText("₹25,000").first()).toBeVisible();
    await expect(page.getByText("No payment received yet.")).toHaveCount(0);

    // too much is refused
    await page.getByRole("button", { name: /Record payment/ }).click();
    await page.locator('input[inputmode="decimal"]').fill("99999");
    await page.getByRole("button", { name: "Save payment" }).click();
    await expect(page.getByText("Only ₹75,000 is still due")).toBeVisible();

    // ₹30,000 by UPI, with a note
    await page.locator('input[inputmode="decimal"]').fill("30000");
    await page.getByRole("button", { name: "UPI", exact: true }).click();
    await page.getByPlaceholder(/UPI ref/).fill("UPI ref 4821");
    await page.getByRole("button", { name: "Save payment" }).click();
    await expect(page.getByText("UPI ref 4821")).toBeVisible();
    await expect(page.getByText("₹45,000").first()).toBeVisible(); // balance due

    // the rest, using Full balance
    await page.getByRole("button", { name: /Record payment/ }).click();
    await expect(page.locator('input[inputmode="decimal"]')).toHaveValue("45000");
    await page.getByRole("button", { name: "Save payment" }).click();
    await expect(page.getByText("Nil").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Record payment/ })).toHaveCount(0);
    await expect(page.getByText("Confirmed", { exact: true }).first()).toBeVisible();

    // the receipt of the second payment: balance after it was ₹45,000
    await page.getByRole("link", { name: "Receipt" }).nth(1).click();
    await expect(page.getByText(/^No: /)).toBeVisible();
    await expect(page.getByText("₹30,000").first()).toBeVisible();
    await expect(page.getByText("Balance due").locator("..").getByText("₹45,000")).toBeVisible();
    await expect(page.getByRole("link", { name: /Send on WhatsApp/ })).toBeVisible();

    // the owner can remove a mistaken payment; the booking goes back to part-paid
    await page.goto(bookingUrl);
    await page.getByRole("button", { name: "Remove this payment" }).nth(2).click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(page.getByText("Advance paid", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Record payment/ })).toBeVisible();

    // a team member can record payments but not remove them
    const made = await page.context().request.post("/api/owner/team", { data: { name: "Ledger Staff", phone: "9847000555" } });
    expect(made.status()).toBe(201);
    const { member, password } = await made.json();
    expect(member.id).toBeTruthy();
    const staff = await browser.newContext();
    await signIn(staff, "9847000555", password);
    const id = bookingUrl.split("/").pop();
    const paymentId = await page.getByRole("link", { name: "Receipt" }).first().getAttribute("href").then((h) => h!.split("/").pop());
    const denied = await staff.request.delete(`/api/owner/bookings/${id}/payments/${paymentId}`);
    expect(denied.status()).toBe(403);
    await staff.close();
  });

  test("a booking with no advance has the whole amount due until a payment is recorded", async ({ page }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    await page.goto("/owner/calendar?new=1");
    await page.locator('form input[type="date"]').first().fill(new Date(Date.now() + 36 * 86400_000).toLocaleDateString("en-CA"));
    await page.locator("form select").first().selectOption({ index: 1 });
    await page.getByPlaceholder("e.g. Anand Krishnan").fill("Unpaid Customer");
    await page.getByPlaceholder("9876543210").fill("9000000777");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText("Paste the customer's message")).toBeHidden();

    await page.goto("/owner/bookings");
    await page.getByRole("row", { name: /Unpaid Customer/ }).getByRole("link", { name: "Details", exact: true }).click();
    await expect(page.getByText("No payment received yet.")).toBeVisible();
    await expect(page.getByText("₹1,00,000").first()).toBeVisible();
    const id = page.url().split("/").pop();

    // the list shows the whole amount as due, not "fully paid"
    await page.goto("/owner/bookings");
    await expect(page.getByRole("row", { name: /Unpaid Customer/ })).toContainText("Due ₹1,00,000");

    // settling it from the booking page leaves one payment behind
    const res = await page.context().request.post(`/api/owner/bookings/${id}/payments`, { data: { amountRupees: 100000, method: "CASH" } });
    expect(res.status()).toBe(201);
    await page.goto(`/owner/bookings/${id}`);
    await expect(page.getByText("No payment received yet.")).toHaveCount(0);
    await expect(page.getByText("Nil").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Receipt" })).toHaveCount(1);
  });
});
