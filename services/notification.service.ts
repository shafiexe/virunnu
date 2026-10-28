import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";

// ── Template keys ─────────────────────────────────────────────────────────────

export const TEMPLATE_KEYS = [
  "customer_booking_confirmed_whatsapp",
  "customer_booking_confirmed_email_subject",
  "customer_booking_confirmed_email",
  "customer_booking_approved_whatsapp",
  "customer_booking_approved_email_subject",
  "customer_booking_approved_email",
  "customer_booking_expired_whatsapp",
  "customer_balance_reminder_whatsapp",
  "customer_balance_reminder_email_subject",
  "customer_balance_reminder_email",
  "owner_new_booking_whatsapp",
  "owner_new_booking_email_subject",
  "owner_new_booking_email",
] as const;

export type TemplateKey = typeof TEMPLATE_KEYS[number];

// ── Variables available in each template ─────────────────────────────────────

export const TEMPLATE_VARIABLES: Record<TemplateKey, string[]> = {
  customer_booking_confirmed_whatsapp:    ["customerName","venueName","hallName","date","timeSlot","totalAmount","paidAmount","balanceAmount","bookingRef","trackUrl"],
  customer_booking_confirmed_email_subject: ["customerName","venueName","date","bookingRef"],
  customer_booking_confirmed_email:       ["customerName","venueName","hallName","date","timeSlot","totalAmount","paidAmount","balanceAmount","bookingRef","trackUrl"],
  customer_booking_approved_whatsapp:     ["customerName","venueName","hallName","date","timeSlot","totalAmount","bookingRef","trackUrl"],
  customer_booking_approved_email_subject: ["customerName","venueName","date","bookingRef"],
  customer_booking_approved_email:        ["customerName","venueName","hallName","date","timeSlot","totalAmount","bookingRef","trackUrl"],
  customer_booking_expired_whatsapp:      ["customerName","venueName","hallName","date","timeSlot"],
  customer_balance_reminder_whatsapp:     ["customerName","venueName","hallName","date","timeSlot","totalAmount","paidAmount","balanceAmount","bookingRef","trackUrl"],
  customer_balance_reminder_email_subject: ["customerName","venueName","date","bookingRef"],
  customer_balance_reminder_email:        ["customerName","venueName","hallName","date","timeSlot","totalAmount","paidAmount","balanceAmount","bookingRef","trackUrl"],
  owner_new_booking_whatsapp:             ["customerName","customerPhone","venueName","hallName","date","timeSlot","totalAmount","bookingRef","dashboardUrl"],
  owner_new_booking_email_subject:        ["customerName","venueName","date"],
  owner_new_booking_email:                ["customerName","customerPhone","venueName","hallName","date","timeSlot","totalAmount","bookingRef","dashboardUrl"],
};

// ── Defaults (hardcoded fallbacks) ────────────────────────────────────────────

export const TEMPLATE_DEFAULTS: Record<TemplateKey, string> = {
  customer_booking_confirmed_whatsapp: `🎉 *Booking Confirmed — Virunnu*

Hi {{customerName}}, your booking is *confirmed*!

━━━━━━━━━━━━━━━━━━
📍 *{{venueName}}*
🏛️ {{hallName}}
📅 {{date}}
⏰ {{timeSlot}}
💰 Total: *{{totalAmount}}*
💵 Paid: {{paidAmount}}
⏳ Balance due: *{{balanceAmount}}*
🔖 Ref: {{bookingRef}}
━━━━━━━━━━━━━━━━━━

See you at the venue! 🙏

📲 Track your booking:
{{trackUrl}}

— Team Virunnu`,

  customer_booking_confirmed_email_subject: `Booking Confirmed — {{venueName}} on {{date}}`,

  customer_booking_confirmed_email: `Dear {{customerName}},

Your booking has been confirmed. Here are the details:

Venue: {{venueName}}
Hall: {{hallName}}
Date: {{date}}
Slot: {{timeSlot}}
Total: {{totalAmount}}
Paid: {{paidAmount}}
Balance due: {{balanceAmount}}
Booking Ref: {{bookingRef}}

Track your booking: {{trackUrl}}

Thank you for choosing {{venueName}}!
— Team Virunnu`,

  customer_booking_approved_whatsapp: `✅ *Booking Approved — Virunnu*

Hi {{customerName}}, your booking request has been *approved*!

━━━━━━━━━━━━━━━━━━
📍 *{{venueName}}*
🏛️ {{hallName}}
📅 {{date}}
⏰ {{timeSlot}}
💰 Total: *{{totalAmount}}*
🔖 Ref: {{bookingRef}}
━━━━━━━━━━━━━━━━━━

Please complete your payment to confirm the booking.

📲 Track your booking:
{{trackUrl}}

— Team Virunnu`,

  customer_booking_approved_email_subject: `Booking Approved — {{venueName}} on {{date}}`,

  customer_booking_approved_email: `Dear {{customerName}},

Your booking request has been approved!

Venue: {{venueName}}
Hall: {{hallName}}
Date: {{date}}
Slot: {{timeSlot}}
Total: {{totalAmount}}
Booking Ref: {{bookingRef}}

Please complete your payment to confirm the booking.
Track your booking: {{trackUrl}}

— Team Virunnu`,

  customer_booking_expired_whatsapp: `⏰ *Booking Hold Expired — Virunnu*

Hi {{customerName}}, your 1-hour slot hold has expired and the slot has been released.

━━━━━━━━━━━━━━━━━━
📍 *{{venueName}}*
🏛️ {{hallName}}
📅 {{date}}
⏰ {{timeSlot}}
━━━━━━━━━━━━━━━━━━

If you'd still like to book this slot, please check if it's still available at virunnu.com.

— Team Virunnu`,

  customer_balance_reminder_whatsapp: `🔔 *Payment Reminder — Virunnu*

Hi {{customerName}}, this is a friendly reminder about your upcoming booking.

━━━━━━━━━━━━━━━━━━
📍 *{{venueName}}*
🏛️ {{hallName}}
📅 {{date}}
⏰ {{timeSlot}}
💰 Total: {{totalAmount}}
💵 Paid: {{paidAmount}}
⚠️ *Balance due: {{balanceAmount}}*
🔖 Ref: {{bookingRef}}
━━━━━━━━━━━━━━━━━━

Please settle the balance before the event date.

📲 Track your booking:
{{trackUrl}}

— Team Virunnu`,

  customer_balance_reminder_email_subject: `Payment Reminder — {{venueName}} on {{date}}`,

  customer_balance_reminder_email: `Dear {{customerName}},

This is a friendly reminder about your balance payment.

Venue: {{venueName}}
Hall: {{hallName}}
Date: {{date}}
Slot: {{timeSlot}}
Total: {{totalAmount}}
Paid: {{paidAmount}}
Balance due: {{balanceAmount}}
Booking Ref: {{bookingRef}}

Track your booking: {{trackUrl}}

Please contact the venue to arrange payment before the event date.

— Team Virunnu`,

  owner_new_booking_whatsapp: `🔔 *New Booking Request — Virunnu*

You have a new booking request for *{{venueName}}*.

━━━━━━━━━━━━━━━━━━
👤 *Customer:* {{customerName}}
📱 {{customerPhone}}
🏛️ *Hall:* {{hallName}}
📅 *Date:* {{date}}
⏰ *Slot:* {{timeSlot}}
💰 *Amount:* {{totalAmount}}
🔖 *Ref:* {{bookingRef}}
━━━━━━━━━━━━━━━━━━

👉 Review and approve on your dashboard:
{{dashboardUrl}}

_Please respond within 1 hour — the slot hold expires._
— Team Virunnu`,

  owner_new_booking_email_subject: `New Booking Request — {{venueName}} on {{date}}`,

  owner_new_booking_email: `A customer has submitted a booking request. Please review and approve within 1 hour.

Customer: {{customerName}}
Phone: {{customerPhone}}
Hall: {{hallName}}
Date: {{date}}
Slot: {{timeSlot}}
Amount: {{totalAmount}}
Ref: {{bookingRef}}

Review on your dashboard: {{dashboardUrl}}

— Team Virunnu`,
};

// ── Template engine ───────────────────────────────────────────────────────────

export type TemplateVars = Partial<{
  customerName: string;
  customerPhone: string;
  venueName: string;
  hallName: string;
  date: string;
  timeSlot: string;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  bookingRef: string;
  trackUrl: string;
  dashboardUrl: string;
}>;

function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars as Record<string, string>)[key] ?? `{{${key}}}`);
}

// Cache per request: orgId → Map<key, body>
async function loadTemplate(orgId: string, key: TemplateKey): Promise<string> {
  const row = await db.orgMessageTemplate.findUnique({ where: { orgId_key: { orgId, key } } });
  return row?.body ?? TEMPLATE_DEFAULTS[key];
}

async function loadTemplateSubject(orgId: string, key: TemplateKey): Promise<string | null> {
  const row = await db.orgMessageTemplate.findUnique({ where: { orgId_key: { orgId, key } } });
  return row?.subject ?? TEMPLATE_DEFAULTS[key] ?? null;
}

// ── Mailer / WhatsApp helpers ─────────────────────────────────────────────────

function getMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });
}

function whatsappClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("twilio")(sid, token);
}

export async function sendRawWhatsApp(to: string, body: string) {
  return sendWhatsApp(to, body);
}

async function sendWhatsApp(to: string, body: string) {
  const client = whatsappClient();
  if (!client) { console.warn("[WhatsApp] Not configured — skipping"); return; }
  const from = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
  await client.messages.create({ from, to: `whatsapp:${to}`, body });
}

function wrapEmailHtml(body: string): string {
  const lines = body.split("\n").map(l => l ? `<p style="margin:0 0 8px;color:#374151;font-size:14px;white-space:pre-wrap">${l}</p>` : `<p style="margin:0 0 4px">&nbsp;</p>`).join("");
  return `<div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 32px">${lines}</div>`;
}

async function sendMail(to: string, subject: string, body: string) {
  if (!process.env.SMTP_USER) { console.warn("[Email] Not configured — skipping"); return; }
  const transport = getMailTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to, subject, text: body, html: wrapEmailHtml(body),
  });
}

// ── Admin: credentials email (not org-templated) ──────────────────────────────

export async function sendCredentialsMail(opts: {
  to: string; name: string; phone: string; password: string; type: "owner" | "caterer";
}) {
  const { to, name, phone, password, type } = opts;
  const role = type === "owner" ? "Convention Center Owner" : "Caterer";
  const appUrl = getAppUrl();
  const transport = getMailTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: `Welcome to Virunnu – Your Login Credentials`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <div style="background:#f59e0b;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;color:#fff;font-size:24px">Welcome to Virunnu!</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Your ${role} account has been approved.</p>
      </div>
      <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
        <p style="color:#374151;margin:0 0 20px">Hi <strong>${name}</strong>,</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:0 0 20px">
          <p style="margin:0 0 6px;color:#111827"><strong>Phone:</strong> ${phone}</p>
          <p style="margin:0;color:#111827"><strong>Password:</strong> <span style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px">${password}</span></p>
        </div>
        <a href="${appUrl}/login" style="display:inline-block;background:#f59e0b;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Log in to Virunnu →</a>
      </div>
    </div>`,
  });
}

export async function sendCredentialsWhatsApp(opts: {
  to: string; name: string; phone: string; password: string; type: "owner" | "caterer";
}) {
  const { to, name, phone, password, type } = opts;
  const role = type === "owner" ? "Convention Center Owner" : "Caterer";
  const appUrl = getAppUrl();
  const body = [
    `🎉 *Virunnu — Welcome, ${name}!*`, ``,
    `Your *${role}* account has been approved.`, ``,
    `📱 Phone: *${phone}*`,
    `🔑 Password: *${password}*`, ``,
    `Login: ${appUrl}/login`,
    `— Team Virunnu`,
  ].join("\n");
  await sendWhatsApp(to, body);
}

// ── Notification types ────────────────────────────────────────────────────────

export type BookingNotifyOpts = {
  orgId: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerName: string;
  venueName: string;
  hallName: string;
  date: string;
  timeSlot: string;
  totalPaise: number;
  paidPaise?: number;
  bookingRef: string;
};

export type OwnerBookingAlertOpts = {
  orgId: string;
  ownerPhone: string;
  ownerEmail?: string | null;
  customerName: string;
  customerPhone: string;
  venueName: string;
  hallName: string;
  date: string;
  timeSlot: string;
  totalPaise: number;
  bookingRef: string;
};

function paiseToRupees(p: number) { return `₹${(p / 100).toLocaleString("en-IN")}`; }

// ── 1. Booking Confirmed ──────────────────────────────────────────────────────

export async function notifyBookingConfirmed(opts: BookingNotifyOpts) {
  const { orgId, customerPhone, customerEmail, customerName, venueName, hallName, date, timeSlot, totalPaise, paidPaise, bookingRef } = opts;
  const appUrl = getAppUrl();
  const balancePaise = Math.max(0, totalPaise - (paidPaise ?? totalPaise));
  const vars: TemplateVars = {
    customerName, venueName, hallName, date, timeSlot,
    totalAmount: paiseToRupees(totalPaise),
    paidAmount: paiseToRupees(paidPaise ?? totalPaise),
    balanceAmount: balancePaise > 0 ? paiseToRupees(balancePaise) : "₹0 (fully paid)",
    bookingRef,
    trackUrl: `${appUrl}/track/${bookingRef}`,
  };

  const [waBody, emailBody, emailSubject] = await Promise.all([
    loadTemplate(orgId, "customer_booking_confirmed_whatsapp"),
    loadTemplate(orgId, "customer_booking_confirmed_email"),
    loadTemplateSubject(orgId, "customer_booking_confirmed_email_subject"),
  ]);

  await Promise.allSettled([
    sendWhatsApp(customerPhone, interpolate(waBody, vars)),
    customerEmail ? sendMail(customerEmail, interpolate(emailSubject ?? `Booking Confirmed — ${venueName}`, vars), interpolate(emailBody, vars)) : Promise.resolve(),
  ]);
}

// ── 2. Booking Approved ───────────────────────────────────────────────────────

export async function notifyBookingApproved(opts: BookingNotifyOpts) {
  const { orgId, customerPhone, customerEmail, customerName, venueName, hallName, date, timeSlot, totalPaise, bookingRef } = opts;
  const appUrl = getAppUrl();
  const vars: TemplateVars = {
    customerName, venueName, hallName, date, timeSlot,
    totalAmount: paiseToRupees(totalPaise),
    bookingRef,
    trackUrl: `${appUrl}/track/${bookingRef}`,
  };

  const [waBody, emailBody, emailSubject] = await Promise.all([
    loadTemplate(orgId, "customer_booking_approved_whatsapp"),
    loadTemplate(orgId, "customer_booking_approved_email"),
    loadTemplateSubject(orgId, "customer_booking_approved_email_subject"),
  ]);

  await Promise.allSettled([
    sendWhatsApp(customerPhone, interpolate(waBody, vars)),
    customerEmail ? sendMail(customerEmail, interpolate(emailSubject ?? `Booking Approved — ${venueName}`, vars), interpolate(emailBody, vars)) : Promise.resolve(),
  ]);
}

// ── 3. Owner — New Booking Request ────────────────────────────────────────────

export async function notifyOwnerNewBooking(opts: OwnerBookingAlertOpts) {
  const { orgId, ownerPhone, ownerEmail, customerName, customerPhone, venueName, hallName, date, timeSlot, totalPaise, bookingRef } = opts;
  const appUrl = getAppUrl();
  const vars: TemplateVars = {
    customerName, customerPhone, venueName, hallName, date, timeSlot,
    totalAmount: paiseToRupees(totalPaise),
    bookingRef,
    dashboardUrl: `${appUrl}/owner/bookings`,
  };

  const [waBody, emailBody, emailSubject] = await Promise.all([
    loadTemplate(orgId, "owner_new_booking_whatsapp"),
    loadTemplate(orgId, "owner_new_booking_email"),
    loadTemplateSubject(orgId, "owner_new_booking_email_subject"),
  ]);

  await Promise.allSettled([
    sendWhatsApp(ownerPhone, interpolate(waBody, vars)),
    ownerEmail ? sendMail(ownerEmail, interpolate(emailSubject ?? `New Booking — ${venueName}`, vars), interpolate(emailBody, vars)) : Promise.resolve(),
  ]);
}

// ── 4. Booking Expired ────────────────────────────────────────────────────────

export async function notifyBookingExpired(opts: {
  orgId: string;
  customerPhone: string;
  customerName: string;
  venueName: string;
  hallName: string;
  date: string;
  timeSlot: string;
}) {
  const { orgId, customerPhone, customerName, venueName, hallName, date, timeSlot } = opts;
  const vars: TemplateVars = { customerName, venueName, hallName, date, timeSlot };
  const waBody = await loadTemplate(orgId, "customer_booking_expired_whatsapp");
  await sendWhatsApp(customerPhone, interpolate(waBody, vars));
}

// ── 5. Balance Reminder ───────────────────────────────────────────────────────

export async function notifyBalanceReminder(opts: BookingNotifyOpts) {
  const { orgId, customerPhone, customerEmail, customerName, venueName, hallName, date, timeSlot, totalPaise, paidPaise, bookingRef } = opts;
  const appUrl = getAppUrl();
  const balancePaise = Math.max(0, totalPaise - (paidPaise ?? 0));
  const vars: TemplateVars = {
    customerName, venueName, hallName, date, timeSlot,
    totalAmount: paiseToRupees(totalPaise),
    paidAmount: paiseToRupees(paidPaise ?? 0),
    balanceAmount: paiseToRupees(balancePaise),
    bookingRef,
    trackUrl: `${appUrl}/track/${bookingRef}`,
  };

  const [waBody, emailBody, emailSubject] = await Promise.all([
    loadTemplate(orgId, "customer_balance_reminder_whatsapp"),
    loadTemplate(orgId, "customer_balance_reminder_email"),
    loadTemplateSubject(orgId, "customer_balance_reminder_email_subject"),
  ]);

  await Promise.allSettled([
    sendWhatsApp(customerPhone, interpolate(waBody, vars)),
    customerEmail ? sendMail(customerEmail, interpolate(emailSubject ?? `Payment Reminder — ${venueName}`, vars), interpolate(emailBody, vars)) : Promise.resolve(),
  ]);
}
