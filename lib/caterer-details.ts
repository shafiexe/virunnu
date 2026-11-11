import { z } from "zod";
import { db } from "@/lib/db";
import { parseGoogleMapsCoords } from "@/lib/maps";
import { MEAL_TYPES } from "@/services/caterer-setup.service";

const nullStr = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((v) => (v === undefined ? undefined : v || null));
const nullInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional();

// Fields a caterer (or admin) may edit after the team is live.
export const catererDetailsSchema = z
  .object({
    address: nullStr(400),
    pincode: nullStr(10),
    googleMapsUrl: nullStr(2000),
    googleRating: z.number().min(0).max(5).nullable().optional(),
    googleReviewCount: nullInt(0, 10000000),
    serviceAreas: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
    serviceRadiusKm: nullInt(0, 1000),
    minGuests: nullInt(1, 100000),
    maxGuests: nullInt(1, 100000),
    leadTimeHours: nullInt(0, 720),
    mealTypes: z.array(z.enum(MEAL_TYPES)).max(4).optional(),
    fssaiNumber: nullStr(20),
    teamSize: nullInt(1, 10000),
    yearsExperience: nullInt(0, 100),
    linkedinUrl: nullStr(500),
    twitterUrl: nullStr(500),
    pastEvents: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(100),
          type: z.string().trim().max(40).optional(),
          guests: z.number().int().min(1).max(100000).optional(),
          note: z.string().trim().max(200).optional(),
        })
      )
      .max(10)
      .optional(),
  })
  .refine((d) => !d.minGuests || !d.maxGuests || d.minGuests <= d.maxGuests, {
    message: "Minimum guests can't be more than maximum guests",
  });

export type CatererDetails = z.infer<typeof catererDetailsSchema>;

// Prisma data for a details patch; keeps pin coordinates in step with the Maps link.
export function detailsToData(d: CatererDetails) {
  const { pastEvents, ...rest } = d;
  const data: Record<string, unknown> = { ...rest };
  if (pastEvents !== undefined) data.pastEvents = pastEvents;
  if (d.googleMapsUrl !== undefined) {
    const c = d.googleMapsUrl ? parseGoogleMapsCoords(d.googleMapsUrl) : null;
    if (c) { data.lat = c.lat; data.lng = c.lng; }
  }
  return data;
}

// "Starting at" follows the cheapest package on the menu.
export async function syncStartingPrice(catererId: string) {
  const agg = await db.catererItem.aggregate({
    where: { catererId, category: "Packages", showOnPublic: true, active: true },
    _min: { ratePaise: true },
  });
  if (agg._min.ratePaise == null) return;
  await db.caterer.update({ where: { id: catererId }, data: { startingPriceRupees: Math.round(agg._min.ratePaise / 100) } });
}
