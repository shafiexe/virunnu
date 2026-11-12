import { defineConfig } from "prisma/config";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadDotEnv() {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["'](.*)["']$/, "$1");
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // Migrations use the direct (non-pooled) Neon address when DIRECT_URL is set; the app itself keeps using the pooled DATABASE_URL
    url: (process.env.DIRECT_URL || process.env.DATABASE_URL)!,
  },
});
