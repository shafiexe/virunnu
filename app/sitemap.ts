import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";

const BASE = "https://virunnu.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const venues = await db.venue.findMany({
    where: { approved: true, org: { disabled: false } },
    select: { id: true, updatedAt: true },
  });

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/track`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    ...venues.map((v) => ({
      url: `${BASE}/venues/${v.id}`,
      lastModified: v.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
