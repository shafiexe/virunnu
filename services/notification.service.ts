import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/app-url";

function getMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });
}

export async function sendCredentialsMail(opts: {
  to: string;
  name: string;
  phone: string;
  password: string;
  type: "owner" | "caterer";
}) {
  const { to, name, phone, password, type } = opts;
  const role = type === "owner" ? "Convention Center Owner" : "Caterer";
  const dashUrl = type === "owner" ? "/owner/dashboard" : "/caterer/dashboard";

  const transport = getMailTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: `Welcome to Virunnu – Your Login Credentials`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <div style="background:#f59e0b;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;color:#fff;font-size:24px">Welcome to Virunnu!</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px">
            Your ${role} account has been approved.
          </p>
        </div>
        <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
          <p style="color:#374151;margin:0 0 20px">Hi <strong>${name}</strong>,</p>
          <p style="color:#374151;margin:0 0 20px">
            Your application has been reviewed and approved by the Virunnu admin team.
            Here are your login credentials:
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:0 0 20px">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px">LOGIN CREDENTIALS</p>
            <p style="margin:0 0 6px;color:#111827;font-size:15px">
              <strong>Username (Phone):</strong> ${phone}
            </p>
            <p style="margin:0;color:#111827;font-size:15px">
              <strong>Password:</strong> <span style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px">${password}</span>
            </p>
          </div>
          <p style="color:#6b7280;font-size:13px;margin:0 0 20px">
            Please change your password after your first login.
          </p>
          <a href="${getAppUrl()}/login"
             style="display:inline-block;background:#f59e0b;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">
            Log in to Virunnu →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">
            If you have any questions, reply to this email or contact our support team.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendCredentialsWhatsApp(opts: {
  to: string; // +91XXXXXXXXXX
  name: string;
  phone: string;
  password: string;
  type: "owner" | "caterer";
}) {
  const { to, name, phone, password, type } = opts;
  const role = type === "owner" ? "Convention Center Owner" : "Caterer";

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

  if (!accountSid || !authToken) {
    console.warn("[WhatsApp] TWILIO credentials not configured — skipping");
    return;
  }

  const twilio = require("twilio")(accountSid, authToken);
  const appUrl = getAppUrl();
  const body = [
    `🎉 *Virunnu — Welcome, ${name}!*`,
    ``,
    `Your *${role}* account has been approved and is ready to use.`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `🔐 *Login Credentials*`,
    `━━━━━━━━━━━━━━━━━━`,
    `📱 Phone: *${phone}*`,
    `🔑 Password: *${password}*`,
    ``,
    `🌐 Login here:`,
    `${appUrl}/login`,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
    `_Keep this message safe. Please change your password after first login._`,
    ``,
    `Need help? Reply to this message or contact our support team.`,
    `— Team Virunnu`,
  ].join("\n");

  await twilio.messages.create({
    from,
    to: `whatsapp:${to}`,
    body,
  });
}

// ── Booking notifications ─────────────────────────────────────────────────────

export type BookingNotifyOpts = {
  customerPhone: string;
  customerEmail?: string | null;
  customerName: string;
  venueName: string;
  hallName: string;
  date: string;        // formatted e.g. "Tuesday, 28 Jan 2025"
  timeSlot: string;    // e.g. "Morning (6am–12pm)"
  totalPaise: number;
  paidPaise?: number;
  bookingRef: string;  // short booking ID
};

function paiseToRupees(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

function whatsappClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return require("twilio")(sid, token);
}

async function sendWhatsApp(to: string, body: string) {
  const client = whatsappClient();
  if (!client) { console.warn("[WhatsApp] Not configured — skipping"); return; }
  const from = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
  await client.messages.create({ from, to: `whatsapp:${to}`, body });
}

async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER) { console.warn("[Email] Not configured — skipping"); return; }
  const transport = getMailTransport();
  await transport.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to, subject, html });
}

// ── 1. Booking Approved ───────────────────────────────────────────────────────
export async function notifyBookingApproved(opts: BookingNotifyOpts) {
  const { customerPhone, customerEmail, customerName, venueName, hallName, date, timeSlot, totalPaise, bookingRef } = opts;
  const appUrl = getAppUrl();

  const waBody = [
    `✅ *Booking Approved — Virunnu*`,
    ``,
    `Hi ${customerName}, your booking request has been *approved*!`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `📍 *${venueName}*`,
    `🏛️ ${hallName}`,
    `📅 ${date}`,
    `⏰ ${timeSlot}`,
    `💰 Total: *${paiseToRupees(totalPaise)}*`,
    `🔖 Ref: ${bookingRef}`,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
    `Please complete your payment to confirm the booking.`,
    `${appUrl}/bookings/${bookingRef}`,
    ``,
    `— Team Virunnu`,
  ].join("\n");

  const emailHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto">
      <div style="background:#10b981;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;color:#fff;font-size:22px">✅ Booking Approved!</h1>
      </div>
      <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
        <p style="color:#374151;margin:0 0 16px">Hi <strong>${customerName}</strong>, your booking request has been approved.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 20px">
          <p style="margin:0 0 6px;color:#374151"><strong>${venueName}</strong> — ${hallName}</p>
          <p style="margin:0 0 6px;color:#6b7280">📅 ${date} &nbsp;⏰ ${timeSlot}</p>
          <p style="margin:0 0 6px;color:#374151">Total: <strong>${paiseToRupees(totalPaise)}</strong></p>
          <p style="margin:0;color:#6b7280;font-size:13px">Ref: ${bookingRef}</p>
        </div>
        <p style="color:#374151;margin:0 0 20px">Please complete your payment to confirm the booking.</p>
        <a href="${appUrl}/bookings/${bookingRef}" style="display:inline-block;background:#10b981;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">View Booking →</a>
      </div>
    </div>`;

  await Promise.allSettled([
    sendWhatsApp(customerPhone, waBody),
    customerEmail ? sendMail(customerEmail, `Booking Approved — ${venueName}`, emailHtml) : Promise.resolve(),
  ]);
}

// ── 2. Booking Confirmed (full / advance paid) ────────────────────────────────
export async function notifyBookingConfirmed(opts: BookingNotifyOpts) {
  const { customerPhone, customerEmail, customerName, venueName, hallName, date, timeSlot, totalPaise, paidPaise, bookingRef } = opts;
  const appUrl = getAppUrl();
  const balancePaise = totalPaise - (paidPaise ?? totalPaise);
  const isFullyPaid = balancePaise <= 0;

  const waBody = [
    `🎉 *Booking Confirmed — Virunnu*`,
    ``,
    `Hi ${customerName}, your booking is *confirmed*!`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `📍 *${venueName}*`,
    `🏛️ ${hallName}`,
    `📅 ${date}`,
    `⏰ ${timeSlot}`,
    `💰 Total: *${paiseToRupees(totalPaise)}*`,
    ...(isFullyPaid
      ? [`✅ Fully paid`]
      : [`💵 Paid: ${paiseToRupees(paidPaise ?? 0)}`, `⏳ Balance due: *${paiseToRupees(balancePaise)}*`]
    ),
    `🔖 Ref: ${bookingRef}`,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
    `See you at the venue! 🙏`,
    `— Team Virunnu`,
  ].join("\n");

  const emailHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto">
      <div style="background:#f59e0b;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;color:#fff;font-size:22px">🎉 Booking Confirmed!</h1>
      </div>
      <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
        <p style="color:#374151;margin:0 0 16px">Hi <strong>${customerName}</strong>, your booking is confirmed.</p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin:0 0 20px">
          <p style="margin:0 0 6px;color:#374151"><strong>${venueName}</strong> — ${hallName}</p>
          <p style="margin:0 0 6px;color:#6b7280">📅 ${date} &nbsp;⏰ ${timeSlot}</p>
          <p style="margin:0 0 4px;color:#374151">Total: <strong>${paiseToRupees(totalPaise)}</strong></p>
          ${isFullyPaid
            ? `<p style="margin:0;color:#10b981;font-weight:600">✅ Fully paid</p>`
            : `<p style="margin:0 0 4px;color:#374151">Paid: ${paiseToRupees(paidPaise ?? 0)}</p>
               <p style="margin:0;color:#f59e0b;font-weight:600">Balance due: ${paiseToRupees(balancePaise)}</p>`
          }
          <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Ref: ${bookingRef}</p>
        </div>
        <a href="${appUrl}/bookings/${bookingRef}" style="display:inline-block;background:#f59e0b;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">View Booking →</a>
      </div>
    </div>`;

  await Promise.allSettled([
    sendWhatsApp(customerPhone, waBody),
    customerEmail ? sendMail(customerEmail, `Booking Confirmed — ${venueName}`, emailHtml) : Promise.resolve(),
  ]);
}

// ── 3. Balance Reminder (owner manually triggers) ─────────────────────────────
export async function notifyBalanceReminder(opts: BookingNotifyOpts) {
  const { customerPhone, customerEmail, customerName, venueName, hallName, date, timeSlot, totalPaise, paidPaise, bookingRef } = opts;
  const appUrl = getAppUrl();
  const balancePaise = totalPaise - (paidPaise ?? 0);

  const waBody = [
    `🔔 *Payment Reminder — Virunnu*`,
    ``,
    `Hi ${customerName}, this is a friendly reminder about your upcoming booking.`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `📍 *${venueName}*`,
    `🏛️ ${hallName}`,
    `📅 ${date}`,
    `⏰ ${timeSlot}`,
    `💰 Total: ${paiseToRupees(totalPaise)}`,
    `💵 Paid: ${paiseToRupees(paidPaise ?? 0)}`,
    `⚠️ *Balance due: ${paiseToRupees(balancePaise)}*`,
    `🔖 Ref: ${bookingRef}`,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
    `Please settle the balance before the event date.`,
    `Contact the venue for payment arrangements.`,
    ``,
    `— Team Virunnu`,
  ].join("\n");

  const emailHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto">
      <div style="background:#f97316;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;color:#fff;font-size:22px">🔔 Payment Reminder</h1>
      </div>
      <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
        <p style="color:#374151;margin:0 0 16px">Hi <strong>${customerName}</strong>, this is a reminder about your balance payment.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;margin:0 0 20px">
          <p style="margin:0 0 6px;color:#374151"><strong>${venueName}</strong> — ${hallName}</p>
          <p style="margin:0 0 6px;color:#6b7280">📅 ${date} &nbsp;⏰ ${timeSlot}</p>
          <p style="margin:0 0 4px;color:#374151">Total: ${paiseToRupees(totalPaise)}</p>
          <p style="margin:0 0 4px;color:#374151">Paid: ${paiseToRupees(paidPaise ?? 0)}</p>
          <p style="margin:0;color:#f97316;font-weight:700;font-size:16px">Balance due: ${paiseToRupees(balancePaise)}</p>
          <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Ref: ${bookingRef}</p>
        </div>
        <p style="color:#374151;margin:0 0 20px">Please contact the venue to arrange payment before the event date.</p>
        <a href="${appUrl}/bookings/${bookingRef}" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">View Booking →</a>
      </div>
    </div>`;

  await Promise.allSettled([
    sendWhatsApp(customerPhone, waBody),
    customerEmail ? sendMail(customerEmail, `Payment Reminder — ${venueName}`, emailHtml) : Promise.resolve(),
  ]);
}
