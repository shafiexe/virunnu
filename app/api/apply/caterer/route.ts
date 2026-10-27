import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2, "Catering service name required"),
  phone: z.string().regex(/^(\+?91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number"),
  email: z.string().email("Enter a valid email address"),
  address: z.string().min(5, "Address required"),
  city: z.string().min(2, "City required"),
  cuisines: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")).or(z.undefined()),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { name, phone, email, address, city, cuisines, website } = parsed.data;

    const digits = phone.replace(/\D/g, "");
    const normalized = digits.length === 12 ? `+${digits}` : digits.length === 11 ? `+${digits}` : `+91${digits}`;

    const existing = await db.catererApplication.findFirst({
      where: {
        OR: [{ phone: normalized }, { email }],
        status: { in: ["PENDING" as const, "APPROVED" as const] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "An application with this phone or email already exists" }, { status: 409 });
    }

    const cuisineList = cuisines
      ? cuisines.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    await db.catererApplication.create({
      data: {
        name,
        phone: normalized,
        email,
        address,
        city,
        cuisines: cuisineList,
        website: website || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[apply/caterer]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
