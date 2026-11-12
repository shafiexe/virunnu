export type CatererDetailsValue = {
  address: string | null; pincode: string | null; googleMapsUrl: string | null;
  googleRating: number | null; googleReviewCount: number | null;
  serviceAreas: string[]; serviceRadiusKm: number | null;
  minGuests: number | null; maxGuests: number | null; leadTimeHours: number | null;
  mealTypes: string[]; fssaiNumber: string | null; teamSize: number | null; yearsExperience: number | null;
  linkedinUrl: string | null; twitterUrl: string | null;
  pastEvents: { title: string; type?: string; guests?: number; note?: string }[];
};

// Plain-object view of a Caterer row, safe to hand to a client component.
export function toDetailsValue(c: {
  address: string | null; pincode: string | null; googleMapsUrl: string | null;
  googleRating: number | null; googleReviewCount: number | null;
  serviceAreas: string[]; serviceRadiusKm: number | null;
  minGuests: number | null; maxGuests: number | null; leadTimeHours: number | null;
  mealTypes: string[]; fssaiNumber: string | null; teamSize: number | null; yearsExperience: number | null;
  linkedinUrl: string | null; twitterUrl: string | null; pastEvents: unknown;
}): CatererDetailsValue {
  return {
    address: c.address, pincode: c.pincode, googleMapsUrl: c.googleMapsUrl,
    googleRating: c.googleRating, googleReviewCount: c.googleReviewCount,
    serviceAreas: c.serviceAreas, serviceRadiusKm: c.serviceRadiusKm,
    minGuests: c.minGuests, maxGuests: c.maxGuests, leadTimeHours: c.leadTimeHours,
    mealTypes: c.mealTypes, fssaiNumber: c.fssaiNumber, teamSize: c.teamSize, yearsExperience: c.yearsExperience,
    linkedinUrl: c.linkedinUrl, twitterUrl: c.twitterUrl,
    pastEvents: Array.isArray(c.pastEvents) ? (c.pastEvents as CatererDetailsValue["pastEvents"]) : [],
  };
}
