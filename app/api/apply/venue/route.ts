import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { centerSchema, normalizePhone } from "@/services/center-setup.service";
import { clientIp, rateLimited } from "@/lib/rate-limit";

const phoneRegex = /^(\+?91)?[6-9]\d{9}$/;

// Same details the admin enters, but city is required and phone must be an Indian mobile.
const applySchema = centerSchema.extend({
  phone: z.string().trim().regex(phoneRegex, "Enter a valid Indian mobile number"),
  whatsappPhone: z.union([z.literal(""), z.string().trim().regex(phoneRegex, "Enter a valid WhatsApp number")]).optional().transform((v) => v || undefined),
  city: z.string().trim().min(2, "City is required").max(80),
});

export async function POST(req: NextRequest) {
  try {
    if (rateLimited(`apply:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const d = parsed.data;
    const phone = normalizePhone(d.phone);
    const email = d.email ?? null;

    const conflicts: object[] = [{ phone }];
    if (email) conflicts.push({ email });
    const [existingApp, existingUser] = await Promise.all([
      db.ownerApplication.findFirst({ where: { OR: conflicts, status: { in: ["PENDING", "APPROVED"] } } }),
      db.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } }),
    ]);
    if (existingApp || existingUser) {
      return NextResponse.json({ error: "An application or account with this phone or email already exists" }, { status: 409 });
    }

    await db.ownerApplication.create({
      data: {
        orgName: d.name,
        venueType: d.venueType,
        phone,
        whatsappPhone: d.whatsappPhone ? normalizePhone(d.whatsappPhone) : null,
        email,
        address: d.address,
        city: d.city,
        website: d.websiteUrl ?? null,
        details: d as unknown as object,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[apply/venue]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
