import { request } from "@playwright/test";
import { writeFileSync } from "fs";

// One throwaway catering team for the whole run. Its address is a reserved test address, so no welcome email or WhatsApp is sent.
export default async function globalSetup() {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const admin = await request.newContext({ baseURL: base });
  const login = await admin.post("/api/admin/auth/login", { data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
  if (!login.ok()) throw new Error("Could not sign in as admin. Is the app running, and are ADMIN_USERNAME and ADMIN_PASSWORD set in .env?");
  const stamp = Date.now().toString().slice(-6);
  const res = await admin.post("/api/admin/caterers", {
    data: {
      name: `ZZ E2E Caterers ${stamp}`, phone: `98470${stamp.slice(-5)}`, email: `e2e${stamp}@example.com`, city: "Kochi", whatsappNumber: `98470${stamp.slice(-5)}`,
      description: "A throwaway team made by the browser tests.", photos: ["https://picsum.photos/id/10/800/500", "https://picsum.photos/id/20/800/500"],
      packages: [{ name: "Gold", pricePerPlate: 220, isVeg: true, dishes: ["Rice"] }], minGuests: 50, maxGuests: 1000,
    },
  });
  if (!res.ok()) throw new Error(`Could not create the test caterer: ${res.status()} ${await res.text()}`);
  const data = await res.json();
  writeFileSync("e2e/.state.json", JSON.stringify({ catererId: data.catererId, orgId: data.orgId, phone: data.phone.replace(/^\+91/, ""), password: data.password }));
  await admin.dispose();
}
