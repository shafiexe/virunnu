import { db } from "@/lib/db";

export type VenueSearchParams = {
  lat?: number;
  lng?: number;
  date?: string;
  guests?: number;
  page?: number;
};

export async function searchVenues(params: VenueSearchParams) {
  const { guests, page = 1 } = params;
  const take = 20;
  const skip = (page - 1) * take;

  return db.venue.findMany({
    where: {
      approved: true,
      org: { disabled: false },
      halls: guests ? { some: { capacity: { gte: guests } } } : undefined,
    },
    include: {
      halls: {
        select: {
          id: true,
          name: true,
          capacity: true,
          pricePerSlot: true,
          amenities: true,
        },
      },
    },
    take,
    skip,
    orderBy: { name: "asc" },
  });
}

export async function getVenue(venueId: string) {
  return db.venue.findUnique({
    where: { id: venueId },
    include: {
      halls: {
        include: {
          slotTemplates: true,
          photos: { orderBy: { sortOrder: "asc" } },
        },
      },
      org: {
        include: {
          facilities: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { amountPaise: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  });
}

export type CreateVenueInput = {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  orgId: string;
};

export async function createVenue(input: CreateVenueInput) {
  return db.venue.create({ data: input });
}

export async function getHallAvailability(hallId: string, from: Date, to: Date) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [slots, blockedDates, hallWithTemplates] = await Promise.all([
    db.hallSlot.findMany({
      where: { hallId, date: { gte: from, lte: to } },
      include: { template: true },
      orderBy: [{ date: "asc" }, { template: { startTime: "asc" } }],
    }),
    db.blockedDate.findMany({
      where: { hallId, date: { gte: from, lte: to } },
      select: { date: true },
    }),
    db.hall.findUnique({
      where: { id: hallId },
      select: { slotTemplates: { orderBy: { startTime: "asc" } } },
    }),
  ]);

  const templates = hallWithTemplates?.slotTemplates ?? [];

  const blockedSet = new Set(blockedDates.map((b) => b.date.toISOString().slice(0, 10)));
  const realSlots = slots.filter((s) => {
    const dateStr = s.date.toISOString().slice(0, 10);
    if (blockedSet.has(dateStr)) return false;
    // Remove past AVAILABLE slots — customers cannot book them
    if (dateStr < todayStr && s.status === "AVAILABLE") return false;
    return true;
  });

  // Keys of real slots so we don't double-show
  const realKeys = new Set(realSlots.map((s) => `${s.templateId}_${s.date.toISOString().slice(0, 10)}`));

  // Virtual slots: AVAILABLE for normal future dates, HELD for owner-blocked (blockedDate) dates
  type VirtualSlot = {
    id: string;
    hallId: string;
    templateId: string;
    date: Date;
    status: "AVAILABLE" | "HELD";
    priceOverride: null;
    heldUntil: null;
    template: (typeof templates)[number];
    createdAt: Date;
    updatedAt: Date;
  };

  const virtualSlots: VirtualSlot[] = [];
  if (templates.length > 0) {
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    let dateStr = fromStr;
    while (dateStr <= toStr) {
      if (dateStr >= todayStr) {
        const isBlocked = blockedSet.has(dateStr);
        for (const tpl of templates) {
          if (isBlocked) {
            // Show blocked days as HELD so customers see "contact venue" message
            virtualSlots.push({
              id: `blocked_${tpl.id}_${dateStr}`,
              hallId,
              templateId: tpl.id,
              date: new Date(dateStr + "T00:00:00.000Z"),
              status: "HELD",
              priceOverride: null,
              heldUntil: null,
              template: tpl,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else if (!realKeys.has(`${tpl.id}_${dateStr}`)) {
            virtualSlots.push({
              id: `virtual_${tpl.id}_${dateStr}`,
              hallId,
              templateId: tpl.id,
              date: new Date(dateStr + "T00:00:00.000Z"),
              status: "AVAILABLE",
              priceOverride: null,
              heldUntil: null,
              template: tpl,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
      const d = new Date(dateStr + "T00:00:00.000Z");
      d.setUTCDate(d.getUTCDate() + 1);
      dateStr = d.toISOString().slice(0, 10);
    }
  }

  return [...realSlots, ...virtualSlots].sort((a, b) => {
    const dc = a.date.getTime() - b.date.getTime();
    return dc !== 0 ? dc : a.template.startTime.localeCompare(b.template.startTime);
  });
}
