import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { account, signIn } from "./helpers";

test.describe("month-end report", () => {
  test("sales, GST, expenses and profit are added up, and the Excel file matches", async ({ page }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    const api = page.context().request;

    // a month far from every other test, so only this test's data is in it
    const event = new Date(Date.now() + 400 * 86400_000);
    const date = event.toLocaleDateString("en-CA");
    const month = date.slice(0, 7);
    const cal = await (await api.get(`/api/owner/calendar?venueId=${centre.venueId}&year=${event.getFullYear()}&month=${event.getMonth() + 1}`)).json();
    const hall = cal.venue.halls[0];
    const made = await api.post("/api/owner/bookings", { data: { venueId: centre.venueId, hallId: hall.id, templateId: hall.slotTemplates[0].id, date, customerPhone: "9000000991", customerName: "Report Customer", amountRupees: 100000 } });
    expect(made.status()).toBe(201);
    const exp = await api.post("/api/owner/expenses", { data: { category: "Electricity", label: "KSEB bill", amountRupees: 12500, date } });
    expect(exp.ok()).toBeTruthy();

    await page.goto(`/owner/reports?month=${month}`);
    await expect(page.getByRole("heading", { name: "Reports", level: 1 })).toBeVisible();
    // billed 1,00,000 with 18% GST inside it: 84,745.76 before GST, 7,627.12 each of CGST and SGST
    await expect(page.getByText("₹1,00,000.00").first()).toBeVisible();
    await expect(page.getByText("₹15,254.24").first()).toBeVisible();
    await expect(page.getByText("CGST ₹7,627.12 · SGST ₹7,627.12")).toBeVisible();
    await expect(page.getByText("₹12,500.00").first()).toBeVisible();
    // nothing was received that month, so the profit is the expenses, as a loss
    await expect(page.getByText("−₹12,500.00").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Report Customer" })).toBeVisible();

    // the Excel file has the same figures
    const res = await api.get(`/api/owner/reports/export?month=${month}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("spreadsheetml");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await res.body()) as never);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Summary", "Sales", "Money received", "Expenses", `Year ${event.getFullYear()}`]);
    const sales = wb.getWorksheet("Sales")!;
    const header = (sales.getRow(1).values as unknown[]).slice(1) as string[];
    const row = (sales.getRow(2).values as unknown[]).slice(1);
    expect(row[header.indexOf("Customer")]).toBe("Report Customer");
    expect(row[header.indexOf("Billed")]).toBe(100000);
    expect(row[header.indexOf("CGST")]).toBe(7627.12);
    const expenses = wb.getWorksheet("Expenses")!;
    expect(expenses.getRow(2).getCell(5).value).toBe(12500);
  });

  test("the report is reachable from the menu and a team member without access does not see it", async ({ page, browser }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    await page.goto("/owner/dashboard");
    await page.locator("aside").getByRole("link", { name: "Reports", exact: true }).click();
    await expect(page).toHaveURL(/\/owner\/reports/);

    const made = await page.context().request.post("/api/owner/team", { data: { name: "Report Staff", phone: "9847000777" } });
    expect(made.status()).toBe(201);
    const { member, password } = await made.json();
    await page.context().request.patch(`/api/owner/team/${member.id}`, { data: { deny: ["reports"] } });
    const staff = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await signIn(staff, "9847000777", password);
    const s = await staff.newPage();
    await s.goto("/owner/dashboard");
    await expect(s.locator("aside").getByRole("link", { name: "Reports", exact: true })).toHaveCount(0);
    expect((await staff.request.get("/api/owner/reports/export")).status()).toBe(403);
    await staff.close();
  });
});
