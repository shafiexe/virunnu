import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const phoneRegex = /^(\+?91)?[6-9]\d{9}$/;

const schema = z.object({
  orgName: z.string().min(2, "Convention center name required"),
  phone: z.string().regex(phoneRegex, "Enter a valid Indian mobile number"),
  whatsappPhone: z.string().regex(phoneRegex, "Enter a valid Indian mobile number").optional().or(z.literal("")),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  address: z.string().min(5, "Address required"),
  city: z.string().min(2, "City required"),
  website: z.string().url().optional().or(z.literal("")).or(z.undefined()),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { orgName, phone, whatsappPhone, email, address, city, website } = parsed.data;

    // Normalize phone to +91XXXXXXXXXX
    const normalizePhone = (p: string) => {
      const d = p.replace(/\D/g, "");
      return d.length === 12 ? `+${d}` : d.length === 11 ? `+${d}` : `+91${d}`;
    };
    const normalized = normalizePhone(phone);
    const normalizedWa = whatsappPhone ? normalizePhone(whatsappPhone) : null;
    const normalizedEmail = email || null;

    const orConditions: object[] = [{ phone: normalized }];
    if (normalizedEmail) orConditions.push({ email: normalizedEmail });

    const existing = await db.ownerApplication.findFirst({
      where: {
        OR: orConditions,
        status: { in: ["PENDING" as const, "APPROVED" as const] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "An application with this phone or email already exists" }, { status: 409 });
    }

    await db.ownerApplication.create({
      data: {
        orgName,
        phone: normalized,
        whatsappPhone: normalizedWa,
        email: normalizedEmail,
        address,
        city,
        website: website || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[apply/venue]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
