import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function makeClient() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });
}

// In development, always make a fresh client so `prisma generate` changes take
// effect without restarting the server. In production, reuse across requests.
export const db =
  process.env.NODE_ENV === "production"
    ? (globalForPrisma.prisma ?? (globalForPrisma.prisma = makeClient()))
    : makeClient();
