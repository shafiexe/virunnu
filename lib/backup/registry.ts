// What a backup holds, in the order it must be restored (a record comes after the ones it points to).
// `where` finds this account's rows; it is also how restore proves a row in the file really belongs to the account.
export type BackupKind = "OWNER" | "CATERER";
export type Ctx = { orgId: string; catererId?: string };

export type Entity = {
  key: string;            // name inside the file
  label: string;          // name of the readable sheet
  model: string;          // Prisma delegate
  kinds: BackupKind[];
  where: (c: Ctx) => object;
  // fields that belong to this account and are always set from the login, never from the file
  forced?: (c: Ctx) => Record<string, string>;
  // the fields that point at other rows of the account; each must be one of them
  parents?: { field: string; entity: string; optional?: boolean }[];
  // read in the backup but never written back (money rules, approvals and website payment ids are not the owner's to change)
  noRestore?: string[];
  exportOnly?: boolean;
  name: (row: Record<string, unknown>) => string; // how the row is named in other sheets
};

const org = (c: Ctx) => ({ orgId: c.orgId });
const viaCaterer = (c: Ctx) => ({ catererId: c.catererId });
const day = (v: unknown) => String(v ?? "").slice(0, 10);
const s = (v: unknown) => String(v ?? "");

export const ENTITIES: Entity[] = [
  // ── shared by both kinds of account
  { key: "employees", label: "Employees", model: "employee", kinds: ["OWNER", "CATERER"], where: org, forced: (c) => ({ orgId: c.orgId }), name: (r) => s(r.name) },
  { key: "expenseCategories", label: "Expense categories", model: "expenseCategory", kinds: ["OWNER", "CATERER"], where: org, forced: (c) => ({ orgId: c.orgId }), name: (r) => s(r.name) },
  { key: "expenseItems", label: "Expense items", model: "expenseItem", kinds: ["OWNER", "CATERER"], where: org, forced: (c) => ({ orgId: c.orgId }), parents: [{ field: "categoryId", entity: "expenseCategories" }], name: (r) => s(r.name) },
  { key: "expenses", label: "Expenses", model: "expense", kinds: ["OWNER", "CATERER"], where: org, forced: (c) => ({ orgId: c.orgId }), parents: [{ field: "employeeId", entity: "employees", optional: true }], name: (r) => `${s(r.label)} ${day(r.date)}` },
  { key: "messageTemplates", label: "Message templates", model: "orgMessageTemplate", kinds: ["OWNER", "CATERER"], where: org, forced: (c) => ({ orgId: c.orgId }), name: (r) => s(r.key) },

  // ── convention centre
  { key: "facilities", label: "Facilities", model: "facility", kinds: ["OWNER"], where: org, forced: (c) => ({ orgId: c.orgId }), name: (r) => s(r.name) },
  { key: "venues", label: "Venue profile", model: "venue", kinds: ["OWNER"], where: org, exportOnly: true, name: (r) => s(r.name) },
  { key: "venueAddons", label: "Venue add-ons", model: "venueAddon", kinds: ["OWNER"], where: (c) => ({ venue: org(c) }), parents: [{ field: "venueId", entity: "venues" }], name: (r) => s(r.name) },
  { key: "halls", label: "Halls", model: "hall", kinds: ["OWNER"], where: (c) => ({ venue: org(c) }), parents: [{ field: "venueId", entity: "venues" }], name: (r) => s(r.name) },
  { key: "slotTemplates", label: "Time slots", model: "slotTemplate", kinds: ["OWNER"], where: (c) => ({ hall: { venue: org(c) } }), parents: [{ field: "hallId", entity: "halls" }], name: (r) => s(r.name) },
  { key: "blockedDates", label: "Blocked dates", model: "blockedDate", kinds: ["OWNER"], where: (c) => ({ hall: { venue: org(c) } }), parents: [{ field: "hallId", entity: "halls" }], name: (r) => day(r.date) },
  { key: "hallSlots", label: "Dates and slots", model: "hallSlot", kinds: ["OWNER"], where: (c) => ({ hall: { venue: org(c) } }), parents: [{ field: "hallId", entity: "halls" }, { field: "templateId", entity: "slotTemplates" }], name: (r) => day(r.date) },
  { key: "bookings", label: "Bookings", model: "booking", kinds: ["OWNER"], where: org, forced: (c) => ({ orgId: c.orgId }), parents: [{ field: "hallSlotId", entity: "hallSlots" }], noRestore: ["razorpayOrderId", "razorpayPaymentId", "userId", "catererId", "catererEnquiryId"], name: (r) => `${s(r.guestName)} ${s(r.id).slice(-6).toUpperCase()}` },
  { key: "bookingAddons", label: "Booking add-ons", model: "bookingAddon", kinds: ["OWNER"], where: (c) => ({ booking: org(c) }), parents: [{ field: "bookingId", entity: "bookings" }], name: (r) => s(r.name) },
  // payments made on the website are Virunnu's to account for (commission, payouts), so they are neither saved nor restored
  { key: "bookingPayments", label: "Booking payments", model: "bookingPayment", kinds: ["OWNER"], where: (c) => ({ ...org(c), method: { not: "ONLINE" } }), forced: (c) => ({ orgId: c.orgId }), parents: [{ field: "bookingId", entity: "bookings" }], noRestore: ["commissionPaise", "gatewayFeePaise"], name: (r) => `${day(r.paidOn)} ${s(r.method)}` },

  // ── caterer
  { key: "menuItems", label: "Public menu", model: "menuItem", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), name: (r) => s(r.name) },
  { key: "items", label: "Items and rates", model: "catererItem", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), name: (r) => s(r.name) },
  { key: "customers", label: "Customers", model: "catererCustomer", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), name: (r) => s(r.name) },
  { key: "suppliers", label: "Suppliers", model: "catererSupplier", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), name: (r) => s(r.name) },
  { key: "orders", label: "Orders", model: "catererOrder", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), parents: [{ field: "customerId", entity: "customers" }], name: (r) => `${day(r.date)} ${s(r.eventType)}`.trim() },
  { key: "servings", label: "Servings", model: "catererServing", kinds: ["CATERER"], where: (c) => ({ order: viaCaterer(c) }), parents: [{ field: "orderId", entity: "orders" }], name: (r) => s(r.label) },
  { key: "bills", label: "Bills and invoices", model: "catererBill", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), parents: [{ field: "orderId", entity: "orders" }], name: (r) => `${s(r.type)} ${s(r.number)}` },
  { key: "orderLines", label: "Bill lines", model: "catererOrderLine", kinds: ["CATERER"], where: (c) => ({ bill: viaCaterer(c) }), parents: [{ field: "billId", entity: "bills" }, { field: "servingId", entity: "servings", optional: true }], name: (r) => s(r.name) },
  { key: "payments", label: "Payments received", model: "catererPayment", kinds: ["CATERER"], where: (c) => ({ bill: viaCaterer(c) }), parents: [{ field: "billId", entity: "bills" }], name: (r) => `${day(r.paidOn)} ${s(r.method)}` },
  { key: "quotes", label: "Quotes", model: "catererQuote", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), parents: [{ field: "customerId", entity: "customers" }], name: (r) => `Quote ${s(r.number)}` },
  { key: "purchases", label: "Purchases", model: "catererPurchase", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), parents: [{ field: "supplierId", entity: "suppliers", optional: true }, { field: "employeeId", entity: "employees", optional: true }, { field: "orderId", entity: "orders", optional: true }], name: (r) => `${day(r.date)} ${s(r.supplier)}` },
  { key: "purchaseLines", label: "Purchase lines", model: "catererPurchaseLine", kinds: ["CATERER"], where: (c) => ({ purchase: viaCaterer(c) }), parents: [{ field: "purchaseId", entity: "purchases" }], name: (r) => s(r.name) },
  { key: "purchasePayments", label: "Purchase payments", model: "catererPurchasePayment", kinds: ["CATERER"], where: (c) => ({ purchase: viaCaterer(c) }), parents: [{ field: "purchaseId", entity: "purchases" }], name: (r) => `${day(r.paidOn)} ${s(r.method)}` },
  { key: "staffPayments", label: "Staff payments", model: "catererStaffPayment", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), parents: [{ field: "employeeId", entity: "employees" }], name: (r) => `${day(r.date)} ${s(r.kind)}` },
  { key: "attendance", label: "Attendance", model: "catererAttendance", kinds: ["CATERER"], where: viaCaterer, forced: (c) => ({ catererId: c.catererId! }), parents: [{ field: "employeeId", entity: "employees" }], name: (r) => day(r.date) },
  { key: "orderStaff", label: "Staff on orders", model: "catererOrderStaff", kinds: ["CATERER"], where: (c) => ({ order: viaCaterer(c) }), parents: [{ field: "orderId", entity: "orders" }, { field: "employeeId", entity: "employees" }], name: (r) => s(r.employeeId) },
  { key: "caterers", label: "Business profile", model: "caterer", kinds: ["CATERER"], where: (c) => ({ id: c.catererId }), exportOnly: true, name: (r) => s(r.name) },
];

// Rows are written parent-first, so the order above is what restore follows. "Profile" sheets are kept for reading only.
export const entitiesFor = (kind: BackupKind) => {
  const list = ENTITIES.filter((e) => e.kinds.includes(kind));
  // the profile goes first in the readable files
  return [...list.filter((e) => e.exportOnly), ...list.filter((e) => !e.exportOnly)];
};
export const entityByKey = (kind: BackupKind, key: string) => entitiesFor(kind).find((e) => e.key === key);
