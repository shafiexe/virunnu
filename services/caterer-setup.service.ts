import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendCredentialsMail, sendCredentialsWhatsApp } from "@/services/notification.service";
import { CenterError, generatePassword, normalizePhone } from "@/services/center-setup.service";
import { isTestEmail } from "@/lib/test-address";

export const SERVICE_KEYS = ["FOOD", "DECORATION", "SERVING_STAFF", "TENT_SHAMIANA", "SOUND_LIGHT", "TRANSPORT"] as const;
export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const;

const opt = (max = 300) =>
  z.string().trim().max(max).optional().transform((v) => v || undefined);

const optInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).optional();

const httpUrl = z.string().trim().max(2000).url().refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) link");

const packageSchema = z.object({
  name: z.string().trim().min(1).max(80),
  pricePerPlate: z.number().int().min(1).max(100000),
  isVeg: z.boolean().default(true),
  dishes: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
});

const itemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: opt(40),
  priceRupees: z.number().int().min(1).max(100000),
  isVeg: z.boolean().default(true),
});

const pastEventSchema = z.object({
  title: z.string().trim().min(1).max(100),
  type: opt(40),
  guests: optInt(1, 100000),
  note: opt(200),
});

export const catererBase = z.object({
    name: z.string().trim().min(2, "Catering team name is required").max(120),
    phone: z.string().trim().min(10, "Enter a valid phone number").max(20),
    whatsappPhone: opt(20),
    email: z.string().trim().email("Enter a valid email").max(200),
    city: z.string().trim().min(2, "City is required").max(80),
    address: opt(400),
    pincode: opt(10),
    description: opt(2000),
    googleMapsUrl: opt(2000),
    lat: z.number().optional(),
    lng: z.number().optional(),
    googleRating: z.number().min(0).max(5).optional(),
    googleReviewCount: optInt(0, 10000000),
    websiteUrl: opt(500),
    instagramUrl: opt(500),
    facebookUrl: opt(500),
    youtubeUrl: opt(500),
    linkedinUrl: opt(500),
    twitterUrl: opt(500),
    cuisines: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
    services: z.array(z.enum(SERVICE_KEYS)).max(6).default(["FOOD"]),
    mealTypes: z.array(z.enum(MEAL_TYPES)).max(4).default([]),
    serviceAreas: z.array(z.string().trim().min(1).max(60)).max(15).default([]),
    serviceRadiusKm: optInt(0, 1000),
    minGuests: optInt(1, 100000),
    maxGuests: optInt(1, 100000),
    leadTimeHours: optInt(0, 720),
    startingPriceRupees: optInt(1, 100000),
    fssaiNumber: opt(20),
    teamSize: optInt(1, 10000),
    yearsExperience: optInt(0, 100),
    packages: z.array(packageSchema).max(12).default([]),
    items: z.array(itemSchema).max(60).default([]),
    pastEvents: z.array(pastEventSchema).max(10).default([]),
    photos: z.array(httpUrl).max(20).default([]),
});

export const catererSchema = catererBase.refine((d) => !d.minGuests || !d.maxGuests || d.minGuests <= d.maxGuests, {
  message: "Minimum guests can't be more than maximum guests",
  path: ["minGuests"],
});

export type CatererInput = z.output<typeof catererSchema>;

// Creates the login account, the public caterer profile and its menu in one transaction.
export async function createCaterer(d: CatererInput) {
  const phone = normalizePhone(d.phone);
  const whatsapp = d.whatsappPhone ? normalizePhone(d.whatsappPhone) : phone;

  const [phoneTaken, emailTaken] = await Promise.all([
    db.user.findUnique({ where: { phone } }),
    db.user.findUnique({ where: { email: d.email } }),
  ]);
  if (phoneTaken) throw new CenterError("An account with this phone number already exists", 409);
  if (emailTaken) throw new CenterError("An account with this email already exists", 409);

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, 10);

  const startingPrice =
    d.startingPriceRupees ?? (d.packages.length ? Math.min(...d.packages.map((p) => p.pricePerPlate)) : undefined);

  const { orgId, catererId } = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: d.name, type: "CATERING" } });

    await tx.user.create({
      data: { phone, name: d.name, email: d.email, password: hashed, role: "CATERER", orgId: org.id },
    });

    const caterer = await tx.caterer.create({
      data: {
        name: d.name,
        phone,
        whatsappNumber: whatsapp,
        email: d.email,
        city: d.city,
        address: d.address ?? null,
        pincode: d.pincode ?? null,
        description: d.description ?? null,
        googleMapsUrl: d.googleMapsUrl ?? null,
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        googleRating: d.googleRating ?? null,
        googleReviewCount: d.googleReviewCount ?? null,
        websiteUrl: d.websiteUrl ?? null,
        instagramUrl: d.instagramUrl ?? null,
        facebookUrl: d.facebookUrl ?? null,
        youtubeUrl: d.youtubeUrl ?? null,
        linkedinUrl: d.linkedinUrl ?? null,
        twitterUrl: d.twitterUrl ?? null,
        cuisines: d.cuisines,
        services: d.services,
        mealTypes: d.mealTypes,
        serviceAreas: d.serviceAreas,
        serviceRadiusKm: d.serviceRadiusKm ?? null,
        minGuests: d.minGuests ?? null,
        maxGuests: d.maxGuests ?? null,
        leadTimeHours: d.leadTimeHours ?? null,
        startingPriceRupees: startingPrice ?? null,
        fssaiNumber: d.fssaiNumber ?? null,
        teamSize: d.teamSize ?? null,
        yearsExperience: d.yearsExperience ?? null,
        pastEvents: d.pastEvents.length ? d.pastEvents : undefined,
        photos: d.photos,
        approved: true,
        orgId: org.id,
      },
    });

    const menu = [
      ...d.packages.map((p) => ({
        name: p.name,
        description: p.dishes.length ? p.dishes.join(", ") : null,
        ratePaise: p.pricePerPlate * 100,
        category: "Packages",
        isVeg: p.isVeg,
        isSpecial: false,
        catererId: caterer.id,
      })),
      ...d.items.map((i) => ({
        name: i.name,
        description: null,
        ratePaise: i.priceRupees * 100,
        category: i.category ?? "Menu",
        isVeg: i.isVeg,
        isSpecial: false,
        catererId: caterer.id,
      })),
    ];
    if (menu.length) await tx.catererItem.createMany({ data: menu.map((m) => ({ ...m, group: "FOOD" as const, unit: "plate", showOnPublic: true })), skipDuplicates: true });

    return { orgId: org.id, catererId: caterer.id };
  });

  return { orgId, catererId, phone, password };
}

export function sendCatererCredentials(opts: { name: string; phone: string; email: string; password: string }) {
  // an example/test address is never a real person: send nothing (no email, no WhatsApp)
  if (isTestEmail(opts.email)) return;
  const creds = { name: opts.name, phone: opts.phone, password: opts.password, type: "caterer" as const };
  Promise.allSettled([
    sendCredentialsMail({ ...creds, to: opts.email }),
    sendCredentialsWhatsApp({ ...creds, to: opts.phone }),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`[Notify][${i}]`, r.reason);
    });
  });
}
