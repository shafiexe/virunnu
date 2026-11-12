import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { catererSchema, catererBase } from "@/services/caterer-setup.service";
import { normalizePhone } from "@/services/center-setup.service";
import { clientIp, rateLimited } from "@/lib/rate-limit";

const phoneRegex = /^(\+?91)?[6-9]\d{9}$/;

const applySchema = catererBase.extend({
  phone: z.string().trim().regex(phoneRegex, "Enter a valid Indian mobile number"),
  whatsappPhone: z.union([z.literal(""), z.string().trim().regex(phoneRegex, "Enter a valid WhatsApp number")]).optional().transform((v) => v || undefined),
  address: z.string().trim().min(5, "Address is required").max(400),
});

export async function POST(req: NextRequest) {
  try {
    if (rateLimited(`apply:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const full = applySchema.safeParse(body);
    if (!full.success) {
      return NextResponse.json({ error: full.error.issues[0]?.message }, { status: 400 });
    }
    // Re-run the cross-field rules (min <= max guests) on the validated data.
    const rules = catererSchema.safeParse(full.data);
    if (!rules.success) {
      return NextResponse.json({ error: rules.error.issues[0]?.message }, { status: 400 });
    }
    const d = rules.data;
    const phone = normalizePhone(d.phone);

    const [existingApp, existingUser] = await Promise.all([
      db.catererApplication.findFirst({
        where: { OR: [{ phone }, { email: d.email }], status: { in: ["PENDING", "APPROVED"] } },
      }),
      db.user.findFirst({ where: { OR: [{ phone }, { email: d.email }] } }),
    ]);
    if (existingApp || existingUser) {
      return NextResponse.json({ error: "An application or account with this phone or email already exists" }, { status: 409 });
    }

    await db.catererApplication.create({
      data: {
        name: d.name,
        phone,
        email: d.email,
        address: d.address ?? "",
        city: d.city,
        cuisines: d.cuisines,
        website: d.websiteUrl ?? null,
        details: d as unknown as object,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[apply/caterer]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
