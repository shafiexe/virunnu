import { importVenuePhotos } from "@/lib/image-store";
import { NextRequest, NextResponse, after } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendCredentialsMail, sendCredentialsWhatsApp } from "@/services/notification.service";
import { centerSchema, createCenter, CenterError, sendCenterCredentials } from "@/services/center-setup.service";
import { isTestEmail } from "@/lib/test-address";

function generatePassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const app = await db.ownerApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.status !== "PENDING") return NextResponse.json({ error: "Already processed" }, { status: 409 });

  // Full application (new form): one approval creates the account and the live listing.
  if (app.details) {
    const parsed = centerSchema.safeParse({
      ...(app.details as object),
      name: app.orgName,
      phone: app.phone,
      email: app.email ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: `Application details are incomplete: ${parsed.error.issues[0]?.message}` }, { status: 422 });
    }
    try {
      const created = await createCenter(parsed.data);
    // the photo links the new account came with are copied into our own storage once the response has gone
    after(() => importVenuePhotos(created.venueId, created.orgId));
      await db.ownerApplication.update({ where: { id }, data: { status: "APPROVED" } });
      sendCenterCredentials({ name: app.orgName, phone: created.phone, email: app.email ?? undefined, password: created.password });
      return NextResponse.json({ ok: true, phone: created.phone, password: created.password, venueId: created.venueId });
    } catch (err) {
      if (err instanceof CenterError) return NextResponse.json({ error: err.message }, { status: err.status });
      console.error("[approve venue application]", err);
      return NextResponse.json({ error: "Could not create the convention center" }, { status: 500 });
    }
  }

  const plainPassword = generatePassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Check if user already exists (re-application)
  const existingUser = await db.user.findUnique({ where: { phone: app.phone } });
  if (existingUser) {
    return NextResponse.json({ error: "A user with this phone already exists" }, { status: 409 });
  }

  await db.$transaction(async (tx) => {
    // Create org
    const org = await tx.organization.create({
      data: { name: app.orgName, type: "CONVENTION" },
    });

    // Create owner user
    await tx.user.create({
      data: {
        phone: app.phone,
        name: app.orgName,
        email: app.email,
        password: hashedPassword,
        role: "OWNER",
        orgId: org.id,
      },
    });

    // Mark application approved
    await tx.ownerApplication.update({
      where: { id },
      data: { status: "APPROVED" },
    });
  });

  // Send notifications (non-blocking — failures don't roll back the approval)
  const notifyName = app.orgName;
  Promise.allSettled(isTestEmail(app.email) ? [] : [
    app.email ? sendCredentialsMail({ to: app.email, name: notifyName, phone: app.phone, password: plainPassword, type: "owner" }) : Promise.resolve(),
    sendCredentialsWhatsApp({ to: app.phone, name: notifyName, phone: app.phone, password: plainPassword, type: "owner" }),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`[Notify][${i}]`, r.reason);
    });
  });

  return NextResponse.json({ ok: true, phone: app.phone, password: plainPassword });
}
