import { db } from "@/lib/db";
import type { SetupStep } from "@/components/setup-checklist";

// What a new catering team still has to do, worked out from what they have already added
export async function catererSetupSteps(caterer: { id: string; orgId: string | null; upiId: string | null; bankDetails: string | null; photos: string[]; description: string | null }): Promise<SetupStep[]> {
  const [org, items, orders, staff] = await Promise.all([
    caterer.orgId ? db.organization.findUnique({ where: { id: caterer.orgId }, select: { logoUpdatedAt: true } }) : null,
    db.catererItem.count({ where: { catererId: caterer.id } }),
    db.catererOrder.count({ where: { catererId: caterer.id } }),
    caterer.orgId ? db.employee.count({ where: { orgId: caterer.orgId } }) : 0,
  ]);
  return [
    { key: "logo", label: "Add your logo", hint: "It prints on every invoice and appears on your public page.", href: "/caterer/profile", done: !!org?.logoUpdatedAt },
    { key: "menu", label: "Add your menu and prices", hint: "One tap adds the usual items; change the rates to yours.", href: "/caterer/items", done: items > 0 },
    { key: "pay", label: "Add your UPI or bank details", hint: "Shown on invoices so customers know how to pay.", href: "/caterer/profile", done: !!(caterer.upiId || caterer.bankDetails) },
    { key: "photos", label: "Add photos and a description", hint: "Customers choose a caterer by how it looks.", href: "/caterer/profile", done: caterer.photos.length > 0 && !!caterer.description },
    { key: "team", label: "Add your team", hint: "Cooks and helpers, so you can pick them on each order.", href: "/caterer/staff", done: staff > 0 },
    { key: "order", label: "Create your first order", hint: "Or send a quotation first. Invoices and balances follow automatically.", href: "/caterer/orders/new", done: orders > 0 },
  ];
}

// The same for a convention centre
export async function venueSetupSteps(orgId: string): Promise<SetupStep[]> {
  const [org, venue, hallPhotos, bookings, team] = await Promise.all([
    db.organization.findUnique({ where: { id: orgId }, select: { logoUpdatedAt: true } }),
    db.venue.findFirst({ where: { orgId }, select: { gstEnabled: true, gstin: true, halls: { select: { description: true } } } }),
    db.hallPhoto.count({ where: { hall: { venue: { orgId } } } }),
    db.booking.count({ where: { orgId } }),
    db.user.count({ where: { orgId, teamMember: true } }),
  ]);
  return [
    { key: "logo", label: "Add your logo", hint: "It prints on every invoice and appears on your public page.", href: "/owner/venues", done: !!org?.logoUpdatedAt },
    { key: "photos", label: "Add hall photos", hint: "Customers choose a hall by how it looks.", href: "/owner/venues", done: hallPhotos > 0 },
    { key: "about", label: "Write a short description of your hall", hint: "A few lines about the hall and what makes it special.", href: "/owner/venues", done: !!venue?.halls.some((h) => !!h.description?.trim()) },
    { key: "gst", label: "Set your GST details", hint: "Add your GSTIN, or switch GST off if you are not registered.", href: "/owner/venues", done: !!venue && (!venue.gstEnabled || !!venue.gstin) },
    { key: "booking", label: "Add your first booking", hint: "Pick a date on the calendar, add the customer, and save.", href: "/owner/calendar", done: bookings > 0 },
    { key: "team", label: "Give your staff a login (optional)", hint: "Each person sees only the pages you choose.", href: "/owner/team", done: team > 0 },
  ];
}
