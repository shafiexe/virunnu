// The same idea as lib/caterer-access.ts, for a convention centre's team: everything is open by default,
// and the owner unticks what to hide. `deny` keys are pages, tabs, or "ro.<page>" for view-only.
import type { AccessGroup } from "@/lib/caterer-access";

export const OWNER_ACCESS_TREE: AccessGroup[] = [
  { title: "Work", items: [
    { key: "dashboard", label: "Dashboard" },
    { key: "calendar", label: "Calendar", hint: "Block dates and slots, add bookings" },
    { key: "bookings", label: "Bookings", hint: "Approve, cancel, record payments, invoices" },
  ] },
  { title: "Lists", items: [
    { key: "customers", label: "Customers" },
    { key: "venues", label: "Settings: Venue", hint: "Halls, slots and prices, photos, amenities, add-ons, GST" },
  ] },
  { title: "Money", items: [
    { key: "expenses", label: "Expenses", tabs: [{ key: "expenses.categories", label: "Categories" }, { key: "expenses.staff", label: "Staff" }] },
  ] },
  { title: "Private details", items: [
    { key: "hide.phones", label: "Customer phone numbers", hint: "Untick to hide numbers and the Call and WhatsApp buttons" },
  ] },
  { title: "Messages", items: [
    { key: "templates", label: "Settings: Templates", hint: "Booking messages sent to customers" },
  ] },
];

type Rule = [RegExp, string[]];
const RULES: Rule[] = [
  [/^\/owner\/(onboarding)/, []],
  [/^\/owner\/no-access/, []],
  [/^\/owner\/(team|activity)/, ["__owner"]], [/^\/api\/owner\/team/, ["__owner"]],
  [/^\/owner\/dashboard/, ["dashboard"]],
  [/^\/owner\/calendar/, ["calendar"]], [/^\/api\/owner\/(calendar|blocked-dates)/, ["calendar"]], [/^\/api\/owner\/hall-slots\/toggle-block/, ["calendar"]],
  [/^\/owner\/enquiries/, ["bookings"]],
  [/^\/owner\/bookings/, ["bookings"]], [/^\/api\/owner\/bookings/, ["bookings"]],
  // bookings are also made, cancelled and paid through these shared routes
  [/^\/api\/bookings/, ["bookings"]], [/^\/api\/payments/, ["bookings"]],
  [/^\/owner\/customers/, ["customers"]], [/^\/api\/owner\/customers/, ["customers"]],
  [/^\/api\/owner\/booking-draft/, ["calendar"]],
  [/^\/owner\/(venues|facilities)/, ["venues"]], [/^\/api\/owner\/(venues|halls|hall-slots|facilities|ai-prefill|logo)/, ["venues"]],
  [/^\/owner\/expenses/, ["expenses"]], [/^\/api\/owner\/expenses/, ["expenses"]],
  [/^\/api\/owner\/expense-categories/, ["expenses", "expenses.categories"]], [/^\/api\/owner\/employees/, ["expenses", "expenses.staff"]],
  [/^\/owner\/workflows/, ["templates"]], [/^\/api\/owner\/templates/, ["templates"]],
];

export function ownerKeysForRequest(pathname: string, method = "GET"): string[] {
  const hit = RULES.find(([re]) => re.test(pathname));
  if (!hit) return [];
  const keys = [...hit[1]];
  if (method !== "GET" && method !== "HEAD" && keys.length && keys[0] !== "__owner") keys.push(`ro.${keys[0]}`);
  return keys;
}

export function canOpenOwner(deny: readonly string[] | undefined, href: string) {
  const keys = ownerKeysForRequest(href.split("?")[0]);
  return !deny?.length || !keys.some((k) => deny.includes(k));
}

const FIRST_STOPS = ["/owner/dashboard", "/owner/calendar", "/owner/enquiries", "/owner/bookings", "/owner/customers", "/owner/venues", "/owner/expenses", "/owner/workflows"];
export const firstAllowedOwnerPage = (deny: readonly string[] | undefined) => FIRST_STOPS.find((p) => canOpenOwner(deny, p)) ?? null;
