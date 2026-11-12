import { readFileSync } from "fs";
import type { BrowserContext, Page } from "@playwright/test";

export type Account = { catererId: string; orgId: string; phone: string; password: string; centre: { orgId: string; venueId: string; phone: string; password: string } };
export const account = (): Account => JSON.parse(readFileSync("e2e/.state.json", "utf-8"));

// Signs in through the app's own login call, so the browser holds a real session cookie
export async function signIn(context: BrowserContext, phone: string, password: string) {
  const res = await context.request.post("/api/auth/login", { data: { phone, password } });
  if (!res.ok()) throw new Error(`Sign-in failed: ${res.status()}`);
}

export const post = (page: Page, url: string, data: object = {}) => page.context().request.post(url, { data });
