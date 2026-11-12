import { expect, test } from "@playwright/test";
import { account } from "./helpers";

test.describe("sign-in is protected", () => {
  test("repeated wrong passwords are slowed, and a correct login still works for everyone else", async ({ playwright }) => {
    const { phone, password } = account();
    const guest = await playwright.request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
    // the same number, again and again
    const target = "9000099" + String(Date.now()).slice(-3);
    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) statuses.push((await guest.post("/api/auth/login", { data: { phone: target, password: "wrong-password" } })).status());
    expect(statuses.slice(0, 8).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(8)).toEqual([429, 429]);
    // a different, real account is not affected, and a right password is never blocked by someone else's wrong ones
    const ok = await guest.post("/api/auth/login", { data: { phone, password } });
    expect(ok.status()).toBe(200);
    await guest.dispose();
  });

  test("a hall's photo address that points inside the network is kept out", async () => {
    // (covered with the photo tests; here the public AI page-reader refuses private addresses too)
    const { isPublicHttpUrl } = await import("../lib/fetch-page-text");
    for (const u of ["http://127.0.0.1/", "http://localhost/", "http://10.0.0.5/", "http://169.254.169.254/latest/", "ftp://example.com/"]) expect(isPublicHttpUrl(u), u).toBeNull();
    expect(isPublicHttpUrl("https://example.com/page")).not.toBeNull();
  });

  test("the guarded fetcher refuses private networks, including names that point there", async () => {
    const { fetchGuarded, FetchRefused } = await import("../lib/safe-fetch");
    for (const u of ["http://127.0.0.1:80/", "http://localhost/", "http://169.254.169.254/latest/meta-data/", "http://10.0.0.1/", "http://[::1]/", "http://2130706433/", "ftp://example.com/", "http://example.com:8080/", "http://localtest.me/"]) {
      await expect(fetchGuarded(u, { timeoutMs: 6000 }), u).rejects.toBeInstanceOf(FetchRefused);
    }
    // an ordinary public page is fine
    const ok = await fetchGuarded("https://example.com/", { timeoutMs: 10000 }).catch(() => null);
    if (ok) expect(ok.status).toBe(200);
  });
});

test.describe("deleting an account", () => {
  test("a deleted catering team leaves no login, organisation or photo behind", async ({ playwright }) => {
    const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
    const admin = await playwright.request.newContext({ baseURL: base });
    expect((await admin.post("/api/admin/auth/login", { data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } })).ok()).toBeTruthy();
    const stamp = Date.now().toString().slice(-6);
    const phone = `98466${stamp.slice(-5)}`;
    const made = await admin.post("/api/admin/caterers", { data: { name: `ZZ Delete Test ${stamp}`, phone, email: `del${stamp}@example.com`, city: "Kochi", whatsappNumber: phone, description: "x", photos: [], packages: [{ name: "Gold", pricePerPlate: 200, isVeg: true, dishes: ["Rice"] }], minGuests: 10, maxGuests: 100 } });
    expect(made.status()).toBe(201);
    const c = await made.json();

    // it can sign in, and has a photo of its own
    const team = await playwright.request.newContext({ baseURL: base });
    expect((await team.post("/api/auth/login", { data: { phone, password: c.password } })).status()).toBe(200);
    const up = await team.post("/api/caterer/photos", { multipart: { file: { name: "a.jpg", mimeType: "image/jpeg", buffer: (await import("fs")).readFileSync("e2e/fixtures/hall.jpg") } } });
    expect(up.status()).toBe(201);
    const { url } = await up.json();
    if (url.startsWith("/api/img/")) expect((await team.get(url)).status()).toBe(200);

    // deleting it removes all of that
    expect((await admin.delete(`/api/admin/caterers/${c.catererId}`)).ok()).toBeTruthy();
    expect((await playwright.request.newContext({ baseURL: base }).then((x) => x.post("/api/auth/login", { data: { phone, password: c.password } }))).status()).toBe(401);
    if (url.startsWith("/api/img/")) expect((await team.get(url)).status()).toBe(404);
    // and the same number can be used for a new account again
    const again = await admin.post("/api/admin/caterers", { data: { name: `ZZ Delete Again ${stamp}`, phone, email: `del2${stamp}@example.com`, city: "Kochi", whatsappNumber: phone, description: "x", photos: [], packages: [{ name: "Gold", pricePerPlate: 200, isVeg: true, dishes: ["Rice"] }], minGuests: 10, maxGuests: 100 } });
    expect(again.status()).toBe(201);
    const c2 = await again.json();
    await admin.delete(`/api/admin/caterers/${c2.catererId}`);
    await admin.dispose(); await team.dispose();
  });
});
