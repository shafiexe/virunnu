import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { buildFacilities } from "@/lib/facility-catalog";
import { sendCredentialsMail, sendCredentialsWhatsApp } from "@/services/notification.service";

export const VENUE_TYPES = ["CONVENTION_CENTER", "AUDITORIUM", "BANQUET_HALL", "RESORT", "HOTEL_RESTAURANT"] as const;

const opt = (max = 300) =>
  z.string().trim().max(max).optional().transform((v) => v || undefined);

const httpUrl = z.string().trim().max(2000).url().refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) link");

export const centerSchema = z.object({
  name: z.string().trim().min(2, "Convention center name is required").max(120),
  venueType: z.enum(VENUE_TYPES).default("CONVENTION_CENTER"),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(20),
  whatsappPhone: opt(20),
  email: z
    .union([z.literal(""), z.string().trim().email("Enter a valid email").max(200)])
    .optional()
    .transform((v) => v || undefined),
  address: z.string().trim().min(3, "Address is required").max(400),
  city: opt(80),
  state: opt(80),
  pincode: opt(10),
  googleMapsUrl: opt(2000),
  lat: z.number().default(0),
  lng: z.number().default(0),
  googleRating: z.number().min(0).max(5).optional(),
  googleReviewCount: z.number().int().min(0).optional(),
  googleReviewUrl: opt(2000),
  websiteUrl: opt(500),
  instagramUrl: opt(500),
  facebookUrl: opt(500),
  youtubeUrl: opt(500),
  linkedinUrl: opt(500),
  twitterUrl: opt(500),
  hallName: opt(120),
  description: opt(2000),
  capacity: z.number().int().min(1, "Capacity is required").max(100000),
  priceRupees: z.number().int().min(1, "Price per slot is required").max(100000000),
  amenities: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  photos: z.array(httpUrl).max(20).default([]),
  slots: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .min(1)
    .max(8)
    .default([
      { name: "Morning", startTime: "08:00", endTime: "14:00" },
      { name: "Evening", startTime: "14:00", endTime: "22:00" },
    ]),
});

export type CenterInput = z.output<typeof centerSchema>;

export class CenterError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const SLOT_DAYS = 60;
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generatePassword(len = 10) {
  return Array.from({ length: len }, () => PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)]).join("");
}

export function normalizePhone(raw: string) {
  const s = raw.replace(/[\s-]/g, "");
  if (s.startsWith("+")) return s;
  const digits = s.replace(/\D/g, "");
  return `+91${digits.length > 10 ? digits.slice(-10) : digits}`;
}

// Creates the login account, the live venue, its hall, slots, facilities and photos in one transaction.
export async function createCenter(d: CenterInput) {
  const phone = normalizePhone(d.phone);
  const whatsapp = d.whatsappPhone ? normalizePhone(d.whatsappPhone) : phone;

  const [phoneTaken, emailTaken] = await Promise.all([
    db.user.findUnique({ where: { phone } }),
    d.email ? db.user.findUnique({ where: { email: d.email } }) : null,
  ]);
  if (phoneTaken) throw new CenterError("An account with this phone number already exists", 409);
  if (emailTaken) throw new CenterError("An account with this email already exists", 409);

  const password = generatePassword();
  const hashed = await bcrypt.hash(password, 10);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { orgId, venueId } = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: d.name, type: "CONVENTION" } });

    await tx.user.create({
      data: { phone, name: d.name, email: d.email ?? null, password: hashed, role: "OWNER", orgId: org.id },
    });

    const venue = await tx.venue.create({
      data: {
        name: d.name,
        venueType: d.venueType,
        address: d.address,
        city: d.city ?? null,
        state: d.state ?? null,
        pincode: d.pincode ?? null,
        lat: d.lat,
        lng: d.lng,
        googleMapsUrl: d.googleMapsUrl ?? null,
        googleRating: d.googleRating ?? null,
        googleReviewCount: d.googleReviewCount ?? null,
        googleReviewUrl: d.googleReviewUrl ?? null,
        websiteUrl: d.websiteUrl ?? null,
        instagramUrl: d.instagramUrl ?? null,
        facebookUrl: d.facebookUrl ?? null,
        youtubeUrl: d.youtubeUrl ?? null,
        linkedinUrl: d.linkedinUrl ?? null,
        twitterUrl: d.twitterUrl ?? null,
        phone,
        whatsappPhone: whatsapp,
        email: d.email ?? null,
        approved: true,
        orgId: org.id,
      },
    });

    const hall = await tx.hall.create({
      data: {
        name: d.hallName ?? d.name,
        capacity: d.capacity,
        pricePerSlot: d.priceRupees * 100,
        description: d.description ?? null,
        amenities: d.amenities,
        venueId: venue.id,
      },
    });

    if (d.photos.length > 0) {
      await tx.hallPhoto.createMany({
        data: d.photos.map((url, i) => ({ hallId: hall.id, url, caption: null, sortOrder: i })),
      });
    }

    const templates = await Promise.all(
      d.slots.map((s) =>
        tx.slotTemplate.create({
          data: { name: s.name, startTime: s.startTime, endTime: s.endTime, hallId: hall.id },
        })
      )
    );

    await tx.hallSlot.createMany({
      data: templates.flatMap((t) =>
        Array.from({ length: SLOT_DAYS }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          return { hallId: hall.id, templateId: t.id, date, status: "AVAILABLE" as const };
        })
      ),
    });

    const facilities = buildFacilities(d.amenities);
    if (facilities.length > 0) {
      await tx.facility.createMany({
        data: facilities.map((f, i) => ({
          orgId: org.id,
          name: f.name,
          description: f.description,
          amountPaise: 0,
          category: f.category,
          icon: f.icon,
          isCustom: f.isCustom,
          sortOrder: i,
        })),
      });
    }

    return { orgId: org.id, venueId: venue.id };
  });

  return { orgId, venueId, phone, password };
}

export function sendCenterCredentials(opts: { name: string; phone: string; email?: string; password: string }) {
  const creds = { name: opts.name, phone: opts.phone, password: opts.password, type: "owner" as const };
  Promise.allSettled([
    opts.email ? sendCredentialsMail({ ...creds, to: opts.email }) : Promise.resolve(),
    sendCredentialsWhatsApp({ ...creds, to: opts.phone }),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`[Notify][${i}]`, r.reason);
    });
  });
}
