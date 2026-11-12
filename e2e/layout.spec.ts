import { expect, test } from "@playwright/test";
import { account, signIn } from "./helpers";

// No page may scroll sideways on a phone, and no page may fail to load
const CATERER = ["dashboard", "calendar", "orders", "orders/new", "quotes", "customers", "items", "expenses", "purchases", "suppliers", "staff", "daybook", "reports", "followup", "messages", "enquiries", "profile", "team"].map((p) => `/caterer/${p}`);
const OWNER = ["dashboard", "calendar", "enquiries", "bookings", "customers", "expenses", "reports", "venues", "workflows", "team", "activity"].map((p) => `/owner/${p}`);

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
      // the test caterer's stock photos come from a slow outside site, so do not wait for them
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status(), path).toBe(200);
      expect(await sidewaysScroll(page), `${path} scrolls sideways`).toBeLessThanOrEqual(1);
    }
  });
});

// Switching tabs must not make the page shrink or grow: the tab row stays exactly where it was
test.describe("tab rows stay put", () => {
  test.use({ viewport: { width: 1440, height: 800 } });

  const GROUPS: { name: string; pages: string[] }[] = [
    { name: "Parties", pages: ["customers", "followup", "suppliers", "staff"] },
    { name: "Orders", pages: ["orders", "enquiries", "quotes"] },
  ];

  for (const g of GROUPS) {
    test(`${g.name} tabs`, async ({ page }) => {
      const a = account();
      await signIn(page.context(), a.phone, a.password);
      const seen: number[] = [];
      for (const p of g.pages) {
        await page.goto(`/caterer/${p}`);
        const box = await page.locator("div.inline-flex.rounded-xl:visible").first().boundingBox();
        expect(box, `${p} has no tab row`).not.toBeNull();
        seen.push(Math.round(box!.x));
      }
      expect(new Set(seen).size, `tab row moves between ${g.pages.join(", ")}: ${seen.join(", ")}`).toBe(1);
    });
  }
});

// Every page sits in the same frame: the same width, left edge and top spacing, so nothing grows, shrinks or slides when you move between menus.
test.describe("one page frame", () => {
  test.use({ viewport: { width: 1440, height: 800 } });

  const CATERER = ["dashboard", "calendar", "orders", "enquiries", "quotes", "daybook", "purchases", "expenses", "reports", "customers", "followup", "suppliers", "staff", "items", "profile", "messages", "team", "activity", "orders/new"].map((p) => `/caterer/${p}`);
  const OWNER = ["dashboard", "calendar", "enquiries", "bookings", "customers", "expenses", "venues", "workflows", "team", "activity"].map((p) => `/owner/${p}`);

  async function frame(page: import("@playwright/test").Page, path: string) {
    await page.goto(path);
    // the page's own frame is the first full-width centred container after the menu
    const box = await page.locator("div.mx-auto.max-w-6xl.px-4:visible").first().boundingBox();
    const h1 = await page.locator("h1").first().boundingBox();
    return { path, x: Math.round(box?.x ?? -1), w: Math.round(box?.width ?? -1), top: Math.round(box?.y ?? -1), h1x: Math.round(h1?.x ?? -1) };
  }

  test("catering pages share one frame", async ({ page }) => {
    const a = account();
    await signIn(page.context(), a.phone, a.password);
    const rows: Awaited<ReturnType<typeof frame>>[] = [];
    for (const p of CATERER) rows.push(await frame(page, p));
    const bad = rows.filter((r) => r.x !== rows[0].x || r.w !== rows[0].w);
    expect(bad, `different frame: ${JSON.stringify(bad)}`).toEqual([]);
  });

  test("convention centre pages share one frame", async ({ page }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    const rows: Awaited<ReturnType<typeof frame>>[] = [];
    for (const p of OWNER) rows.push(await frame(page, p));
    const bad = rows.filter((r) => r.x !== rows[0].x || r.w !== rows[0].w);
    expect(bad, `different frame: ${JSON.stringify(bad)}`).toEqual([]);
  });
});

// Admin pages, customer pages and the public pages that sit under the same header and footer line up too
test.describe("other page frames", () => {
  test.use({ viewport: { width: 1440, height: 800 } });

  test("admin pages share one frame", async ({ page }) => {
    const res = await page.context().request.post("/api/admin/auth/login", { data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
    expect(res.ok()).toBeTruthy();
    const a = account();
    const seen: string[] = [];
    for (const p of ["/admin", "/admin/owners", "/admin/caterers", "/admin/applications", `/admin/caterers/${a.catererId}`, `/admin/owners/${a.centre.orgId}`]) {
      await page.goto(p);
      const box = await page.locator("div.mx-auto.max-w-5xl.px-4:visible").first().boundingBox();
      seen.push(`${Math.round(box?.x ?? -1)}:${Math.round(box?.width ?? -1)}`);
    }
    expect(new Set(seen).size, `admin frames differ: ${seen.join(" ")}`).toBe(1);
  });

  test("home, venue page, caterer page and apply pages are as wide as the site header", async ({ page }) => {
    const a = account();
    const seen: string[] = [];
    for (const p of ["/", `/venues/${a.centre.venueId}`, `/caterers/${a.catererId}`, "/apply/venue", "/apply/caterer"]) {
      await page.goto(p);
      const box = await page.locator("div.mx-auto.max-w-5xl.px-4:visible").first().boundingBox();
      seen.push(`${Math.round(box?.x ?? -1)}:${Math.round(box?.width ?? -1)}`);
    }
    expect(new Set(seen).size, `public frames differ: ${seen.join(" ")}`).toBe(1);
  });
});

// Menu & Prices fills the same frame as the other lists, and the Save bar of a form lines up with the form above it
test.describe("menu and form bars", () => {
  test.use({ viewport: { width: 1440, height: 800 } });

  test("Menu & Prices is a narrow column on the frame's left edge and the order form's Save bar lines up", async ({ page }) => {
    const a = account();
    await signIn(page.context(), a.phone, a.password);
    await page.request.post("/api/caterer/items/starter");
    await page.goto("/caterer/items");
    const frameBox = await page.locator("div.mx-auto.max-w-6xl.px-4:visible").first().boundingBox();
    const sections = await page.locator("section").evaluateAll((ns) => ns.map((n) => ({ left: Math.round(n.getBoundingClientRect().left), width: Math.round(n.getBoundingClientRect().width) })));
    // one narrow column, starting at the frame's left edge like the Settings pages
    for (const s of sections) { expect(s.left).toBe(Math.round(frameBox!.x + 16)); expect(s.width).toBeLessThanOrEqual(768); }

    await page.goto("/caterer/orders/new");
    const formLeft = Math.round((await page.locator("h1").first().boundingBox())!.x);
    const barLeft = Math.round((await page.getByRole("button", { name: "Save order" }).locator("xpath=ancestor::div[contains(@class,'max-w-3xl')][1]").boundingBox())!.x);
    expect(barLeft, "the Save bar starts where the form starts").toBe(formLeft);
  });
});

