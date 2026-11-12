import { request } from "@playwright/test";
import { execFileSync } from "child_process";
import { existsSync, readFileSync, rmSync } from "fs";

export default async function globalTeardown() {
  if (!existsSync("e2e/.state.json")) return;
  const { catererId, orgId, centre } = JSON.parse(readFileSync("e2e/.state.json", "utf-8"));
  const admin = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  await admin.post("/api/admin/auth/login", { data: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
  await admin.delete(`/api/admin/caterers/${catererId}`);
  if (centre?.orgId) await admin.delete(`/api/admin/owners/${centre.orgId}`);
  await admin.dispose();
  // The admin delete removes the caterer only; take the throwaway login(s) and organisation with it
  if (process.env.DATABASE_URL && orgId) {
    try { execFileSync("psql", [process.env.DATABASE_URL, "-c", `delete from "ActivityLog" where "orgId"='${orgId}'; delete from "User" where "orgId"='${orgId}'; delete from "Organization" where id='${orgId}';`], { stdio: "ignore" }); } catch { /* leftovers are named "ZZ E2E" */ }
  }
  rmSync("e2e/.state.json", { force: true });
}
