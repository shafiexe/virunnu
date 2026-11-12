import { expect, test } from "@playwright/test";
import { account, signIn } from "./helpers";

test.describe("catering settings", () => {
  test("desktop: Settings gathers profile, messages, team logins and activity; Menu & Prices stays", async ({ browser }) => {
    const a = account();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await signIn(ctx, a.phone, a.password);
    const page = await ctx.newPage();
    await page.goto("/caterer/items");

    const side = page.locator("aside");
    for (const gone of ["Service Profile", "Messages", "Team logins", "Activity"]) await expect(side.getByRole("link", { name: gone, exact: true })).toHaveCount(0);
    await expect(side.getByRole("link", { name: "Menu & Prices", exact: true })).toBeVisible();

    await side.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page).toHaveURL(/\/caterer\/profile/);
    const tabs = page.getByRole("navigation", { name: "Settings" });
    await expect(tabs.getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: "Team logins" }).click();
    await expect(page.getByRole("heading", { name: "Team logins", level: 1 })).toBeVisible();
    await expect(side.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
    await tabs.getByRole("link", { name: "Messages" }).click();
    await expect(page).toHaveURL(/\/caterer\/messages/);
    await ctx.close();
  });

  test("phone: the bottom bar reaches Settings and its tabs", async ({ browser }) => {
    const a = account();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await signIn(ctx, a.phone, a.password);
    const p = await ctx.newPage();
    await p.goto("/caterer/dashboard");
    const bar = p.locator("nav.fixed");
    await bar.getByRole("link", { name: "Settings" }).click();
    await expect(p).toHaveURL(/\/caterer\/profile/);
    await p.getByRole("navigation", { name: "Settings" }).getByRole("link", { name: "Activity" }).click();
    await expect(p.getByRole("heading", { name: "Activity", level: 1 })).toBeVisible();
    expect(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await ctx.close();
  });

  test("a team member without access to Messages does not get that tab", async ({ browser }) => {
    const a = account();
    const owner = await browser.newContext();
    await signIn(owner, a.phone, a.password);
    const made = await owner.request.post("/api/caterer/team", { data: { name: "Settings Staff", phone: "9847000666" } });
    expect(made.status()).toBe(201);
    const { member, password } = await made.json();
    await owner.request.patch(`/api/caterer/team/${member.id}`, { data: { deny: ["messages"] } });

    const staff = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await signIn(staff, "9847000666", password);
    const s = await staff.newPage();
    await s.goto("/caterer/dashboard");
    await s.locator("aside").getByRole("link", { name: "Settings", exact: true }).click();
    await expect(s).toHaveURL(/\/caterer\/profile/);
    // Messages is hidden for them, and Team logins and Activity are the owner's alone, so only Profile is left: no tab row
    await expect(s.getByRole("navigation", { name: "Settings" })).toHaveCount(0);
    await owner.close(); await staff.close();
  });
});
