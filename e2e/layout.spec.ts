import { expect, test } from "@playwright/test";
import { account, signIn } from "./helpers";

// No page may scroll sideways on a phone, and no page may fail to load
const CATERER = ["dashboard", "calendar", "orders", "orders/new", "quotes", "customers", "items", "expenses", "purchases", "suppliers", "staff", "daybook", "reports", "followup", "messages", "enquiries", "profile", "team"].map((p) => `/caterer/${p}`);
const OWNER = ["dashboard", "calendar", "enquiries", "bookings", "customers", "expenses", "venues", "workflows", "team", "activity"].map((p) => `/owner/${p}`);

async function sidewaysScroll(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test.describe("phone layout", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("catering pages fit the screen", async ({ page }) => {
    const a = account();
    await signIn(page.context(), a.phone, a.password);
    for (const path of CATERER) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      expect(await sidewaysScroll(page), `${path} scrolls sideways`).toBeLessThanOrEqual(1);
    }
  });

  test("convention centre pages fit the screen", async ({ page }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    for (const path of OWNER) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      expect(await sidewaysScroll(page), `${path} scrolls sideways`).toBeLessThanOrEqual(1);
    }
  });

  test("public pages fit the screen", async ({ page }) => {
    const a = account();
    for (const path of ["/", "/login", `/venues/${a.centre.venueId}`, `/caterers/${a.catererId}`]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      expect(await sidewaysScroll(page), `${path} scrolls sideways`).toBeLessThanOrEqual(1);
    }
  });
});
