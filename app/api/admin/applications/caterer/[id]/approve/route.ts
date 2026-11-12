import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendCredentialsMail, sendCredentialsWhatsApp } from "@/services/notification.service";
import { catererSchema, createCaterer, sendCatererCredentials } from "@/services/caterer-setup.service";
import { CenterError } from "@/services/center-setup.service";

function generatePassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const app = await db.catererApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.status !== "PENDING") return NextResponse.json({ error: "Already processed" }, { status: 409 });

  // Full application (new form): one approval creates the account and the live profile with its menu.
  if (app.details) {
    const parsed = catererSchema.safeParse({
      ...(app.details as object),
      name: app.name,
      phone: app.phone,
      email: app.email,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: `Application details are incomplete: ${parsed.error.issues[0]?.message}` }, { status: 422 });
    }
    try {
      const created = await createCaterer(parsed.data);
      await db.catererApplication.update({ where: { id }, data: { status: "APPROVED" } });
      sendCatererCredentials({ name: app.name, phone: created.phone, email: app.email, password: created.password });
      return NextResponse.json({ ok: true, phone: created.phone, password: created.password, catererId: created.catererId });
    } catch (err) {
      if (err instanceof CenterError) return NextResponse.json({ error: err.message }, { status: err.status });
      console.error("[approve caterer application]", err);
      return NextResponse.json({ error: "Could not create the catering team" }, { status: 500 });
    }
  }

  const existingUser = await db.user.findUnique({ where: { phone: app.phone } });
  if (existingUser) {
    return NextResponse.json({ error: "A user with this phone already exists" }, { status: 409 });
  }

  const plainPassword = generatePassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await db.$transaction(async (tx) => {
    // Create org for caterer
    const org = await tx.organization.create({
      data: { name: app.name, type: "CATERING" },
    });

    // Create caterer user
    await tx.user.create({
      data: {
        phone: app.phone,
        name: app.name,
        email: app.email,
        password: hashedPassword,
        role: "CATERER",
        orgId: org.id,
      },
    });

    // Create Caterer record
    await tx.caterer.create({
      data: {
        name: app.name,
        phone: app.phone,
        city: app.city,
        cuisines: app.cuisines,
        approved: true,
        orgId: org.id,
      },
    });

    await tx.catererApplication.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  });

  Promise.allSettled([
    sendCredentialsMail({ to: app.email, name: app.name, phone: app.phone, password: plainPassword, type: "caterer" }),
    sendCredentialsWhatsApp({ to: app.phone, name: app.name, phone: app.phone, password: plainPassword, type: "caterer" }),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`[Notify][${i}]`, r.reason);
    });
  });

  return NextResponse.json({ ok: true, phone: app.phone, password: plainPassword });
}
