import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { readFileSync } from "fs";
import { isPrivateAddress } from "../lib/safe-fetch";
import { account, signIn } from "./helpers";

const photo = () => readFileSync("e2e/fixtures/hall.jpg");

async function hallId(page: import("@playwright/test").Page, venueId: string) {
  const now = new Date();
  const cal = await (await page.context().request.get(`/api/owner/calendar?venueId=${venueId}&year=${now.getFullYear()}&month=${now.getMonth() + 1}`)).json();
  return cal.venue.halls[0].id as string;
}

test.describe("photo storage", () => {
  test("addresses that must never be fetched are recognised", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "1.1.1.1", "142.250.80.46", "2606:4700:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  test("a hall photo is uploaded, shrunk, served for good and removed", async ({ page, browser }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    const api = page.context().request;
    const id = await hallId(page, centre.venueId);

    const up = await api.post(`/api/owner/halls/${id}/photos`, { multipart: { file: { name: "big.jpg", mimeType: "image/jpeg", buffer: photo() } } });
    expect(up.status()).toBe(201);
    const saved = await up.json();
    expect(saved.copied).toBe(true);

    // served from our own address (or the Blob store), as a modest JPEG with no camera data
    const img = await api.get(saved.url.startsWith("/") ? saved.url : saved.url);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toBe("image/jpeg");
    if (saved.url.startsWith("/api/img/")) expect(img.headers()["cache-control"]).toContain("immutable");
    const meta = await sharp(await img.body()).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1800);
    expect(meta.exif).toBeUndefined();

    // a visitor who is not signed in sees it on the venue's page
    const visitor = await browser.newContext();
    const v = await visitor.newPage();
    await v.goto(`/venues/${centre.venueId}`);
    await expect.poll(async () => v.locator(`img[src="${saved.url}"]`).first().evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0).catch(() => false), { timeout: 15_000 }).toBe(true);
    await visitor.close();

    // removing the photo removes the saved copy
    const del = await api.delete(`/api/owner/halls/${id}/photos/${saved.id}`);
    expect(del.ok()).toBeTruthy();
    if (saved.url.startsWith("/api/img/")) expect((await api.get(saved.url)).status()).toBe(404);
  });

  test("a file that is not a photo is refused with a clear message", async ({ page }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    const id = await hallId(page, centre.venueId);
    const res = await page.context().request.post(`/api/owner/halls/${id}/photos`, { multipart: { file: { name: "notes.jpg", mimeType: "image/jpeg", buffer: Buffer.from("this is not a picture at all, just text") } } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/not a photo/i);
  });

  test("a photo link is copied, and links that must not be read are kept as links", async ({ page }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    const api = page.context().request;
    const id = await hallId(page, centre.venueId);

    // an address inside our own network is never fetched, but the link is still saved as before
    for (const link of ["http://127.0.0.1:3000/anything.jpg", "http://169.254.169.254/latest/meta-data/", "http://localhost:3000/api/health"]) {
      const res = await api.post(`/api/owner/halls/${id}/photos`, { data: { url: link } });
      expect(res.status(), link).toBe(201);
      const d = await res.json();
      expect(d.copied, link).toBe(false);
      expect(d.url, link).toBe(link);
      await api.delete(`/api/owner/halls/${id}/photos/${d.id}`);
    }

    // a real public photo is copied into our storage; the first of these hosts that answers is used
    const hosts = ["https://www.python.org/static/img/python-logo.png", "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png", "https://httpbin.org/image/jpeg"];
    let link = "";
    for (const h of hosts) { if (await fetch(h, { signal: AbortSignal.timeout(6000) }).then((r) => r.ok && (r.headers.get("content-type") ?? "").startsWith("image/")).catch(() => false)) { link = h; break; } }
    test.skip(!link, "needs internet access");
    const res = await api.post(`/api/owner/halls/${id}/photos`, { data: { url: link } });
    expect(res.status()).toBe(201);
    const d = await res.json();
    expect(d.copied).toBe(true);
    expect(d.url).not.toContain(new URL(link).hostname);
    expect((await api.get(d.url)).status()).toBe(200);
    await api.delete(`/api/owner/halls/${id}/photos/${d.id}`);
  });

  test("the upload button on the venue page adds a photo", async ({ page }) => {
    const { centre } = account();
    await signIn(page.context(), centre.phone, centre.password);
    // wait until the page is ready to react before choosing a file (in dev the first load can still be hydrating)
    await page.goto("/owner/venues", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const before = await page.locator('img[src^="/api/img/"], img[src*="blob.vercel-storage.com"]').count();
    await page.locator('input[type="file"]').first().setInputFiles("e2e/fixtures/hall.jpg");
    await expect.poll(async () => page.locator('img[src^="/api/img/"], img[src*="blob.vercel-storage.com"]').count(), { timeout: 20_000 }).toBeGreaterThan(before);
  });

  test("a caterer can upload a photo, save it, and it shows on the public page", async ({ page, browser }) => {
    const a = account();
    await signIn(page.context(), a.phone, a.password);
    const api = page.context().request;

    // the button on the profile page
    await page.goto("/caterer/profile", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.getByLabel("Photo file").setInputFiles("e2e/fixtures/hall.jpg");
    await expect(page.locator('img[src^="/api/img/"], img[src*="blob.vercel-storage.com"]').first()).toBeVisible({ timeout: 20_000 });

    // saved with the profile and shown to visitors
    const up = await api.post("/api/caterer/photos", { multipart: { file: { name: "menu.jpg", mimeType: "image/jpeg", buffer: photo() } } });
    expect(up.status()).toBe(201);
    const { url } = await up.json();
    const save = await api.patch("/api/caterer/profile", { data: { photos: [url] } });
    expect(save.ok()).toBeTruthy();
    const visitor = await browser.newContext();
    const v = await visitor.newPage();
    await v.goto(`/caterers/${a.catererId}`, { waitUntil: "domcontentloaded" });
    await expect.poll(async () => v.locator(`img[src="${url}"]`).first().evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0).catch(() => false), { timeout: 15_000 }).toBe(true);
    await visitor.close();

    // taking the photo off the page removes its saved copy
    await api.patch("/api/caterer/profile", { data: { photos: [] } });
    if (url.startsWith("/api/img/")) await expect.poll(async () => (await api.get(url)).status(), { timeout: 15_000 }).toBe(404);
  });

  test("a visitor cannot upload, and one account cannot add photos to another's hall", async ({ browser, page }) => {
    const { centre } = account();
    const anon = await browser.newContext();
    const res = await anon.request.post(`/api/owner/halls/anything/photos`, { multipart: { file: { name: "x.jpg", mimeType: "image/jpeg", buffer: photo() } } });
    expect(res.status()).toBe(403);
    expect((await anon.request.post("/api/caterer/photos", { multipart: { file: { name: "x.jpg", mimeType: "image/jpeg", buffer: photo() } } })).status()).toBe(401);
    // the caterer's account has no right to the centre's hall
    const a = account();
    await signIn(page.context(), a.phone, a.password);
    const hall = await page.context().request.post(`/api/owner/halls/${centre.venueId}/photos`, { multipart: { file: { name: "x.jpg", mimeType: "image/jpeg", buffer: photo() } } });
    expect([403, 404]).toContain(hall.status());
    await anon.close();
  });
});
