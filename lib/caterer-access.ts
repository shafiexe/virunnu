// What a catering team member may open. Everything is open by default; the owner unticks what to hide.
// `deny` holds the hidden keys. A page key hides the page and its tabs; "ro.<page>" keeps the page visible but read-only.
// Pure code (no database) so the proxy, the menu and the pages all use the same rules.

export type AccessItem = { key: string; label: string; hint?: string; tabs?: { key: string; label: string }[] };
export type AccessGroup = { title: string; items: AccessItem[] };

export const REPORT_TABS = [
  { key: "reports.overview", label: "Scorecard" }, { key: "reports.trend", label: "Sales trend" }, { key: "reports.customers", label: "Customers" },
  { key: "reports.items", label: "Items & analytics" }, { key: "reports.functions", label: "Functions & profit" }, { key: "reports.costs", label: "Costs & suppliers" },
  { key: "reports.staff", label: "Staff cost" }, { key: "reports.pl", label: "Profit & Loss" }, { key: "reports.balances", label: "Balances" },
  { key: "reports.aging", label: "Aging" }, { key: "reports.balance", label: "Balance Sheet" }, { key: "reports.cash", label: "Cash & Bank" },
];

// Laid out like the menu, so the owner finds things where they expect
export const ACCESS_TREE: AccessGroup[] = [
  { title: "Work", items: [
    { key: "dashboard", label: "Dashboard" },
    { key: "calendar", label: "Calendar" },
    { key: "orders", label: "Orders", tabs: [{ key: "orders.enquiries", label: "Enquiries" }, { key: "orders.quotes", label: "Quotations" }] },
  ] },
  { title: "Money", items: [
    { key: "daybook", label: "Day Book", hint: "Every bill and payment, with totals and Excel download" },
    { key: "purchases", label: "Purchases" },
    { key: "expenses", label: "Expenses", tabs: [{ key: "expenses.categories", label: "Categories" }] },
    { key: "reports", label: "Reports", hint: "Profit, balances and analysis", tabs: REPORT_TABS },
  ] },
  { title: "Private details", items: [
    { key: "hide.phones", label: "Customer phone numbers", hint: "Untick to hide numbers and the Call and WhatsApp buttons" },
    { key: "hide.profit", label: "Profit and margins", hint: "Untick to hide profit on the dashboard and on each order" },
    { key: "hide.salaries", label: "Staff pay", hint: "Untick to hide salaries, wages and what each person is paid" },
  ] },
  { title: "Lists", items: [
    { key: "parties", label: "Parties", tabs: [{ key: "parties.customers", label: "Customers" }, { key: "parties.followup", label: "Follow-up" }, { key: "parties.suppliers", label: "Suppliers" }, { key: "parties.staff", label: "Staff & pay" }] },
    { key: "menu", label: "Menu & Prices" },
    { key: "profile", label: "Service Profile", hint: "Public page, logo, invoice and GST settings" },
    { key: "messages", label: "Messages", hint: "WhatsApp wording and the nightly summary" },
  ] },
];

type Rule = [RegExp, string[]];
// First match wins, so the specific rules come first. Paths with no rule are open to everyone signed in.
const RULES: Rule[] = [
  [/^\/caterer\/(no-access|onboarding)/, []],
  [/^\/api\/caterer\/find/, []],
  [/^\/api\/caterer\/customers\/[^/]+\/reminded/, []],
  [/^\/caterer\/(team|activity)/, ["__owner"]], [/^\/api\/caterer\/team/, ["__owner"]],
  [/^\/caterer\/dashboard/, ["dashboard"]],
  [/^\/caterer\/calendar/, ["calendar"]],
  [/^\/caterer\/enquiries/, ["orders", "orders.enquiries"]], [/^\/api\/caterer\/enquiries/, ["orders", "orders.enquiries"]],
  [/^\/caterer\/quotes/, ["orders", "orders.quotes"]], [/^\/api\/caterer\/quotes/, ["orders", "orders.quotes"]],
  [/^\/caterer\/orders/, ["orders"]], [/^\/api\/caterer\/(orders|bills)/, ["orders"]],
  [/^\/caterer\/(daybook|payments)/, ["daybook"]],
  [/^\/caterer\/purchases/, ["purchases"]], [/^\/api\/caterer\/purchases/, ["purchases"]],
  [/^\/caterer\/expenses/, ["expenses"]], [/^\/api\/owner\/(expenses|employees)/, ["expenses"]], [/^\/api\/owner\/expense-categories/, ["expenses", "expenses.categories"]],
  [/^\/caterer\/reports/, ["reports"]],
  [/^\/caterer\/followup/, ["parties", "parties.followup"]],
  [/^\/caterer\/customers/, ["parties", "parties.customers"]], [/^\/api\/caterer\/customers/, ["parties", "parties.customers"]],
  [/^\/caterer\/suppliers/, ["parties", "parties.suppliers"]], [/^\/api\/caterer\/suppliers/, ["parties", "parties.suppliers"]],
  [/^\/caterer\/staff/, ["parties", "parties.staff"]], [/^\/api\/caterer\/staff/, ["parties", "parties.staff"]],
  [/^\/caterer\/items/, ["menu"]], [/^\/api\/caterer\/(items|menu)/, ["menu"]],
  [/^\/caterer\/profile/, ["profile"]], [/^\/api\/caterer\/invoice-settings/, ["profile"]], [/^\/api\/owner\/logo/, ["profile"]],
  [/^\/caterer\/messages/, ["messages"]], [/^\/api\/caterer\/(summary|summary-settings|message-templates)/, ["messages"]],
  [/^\/api\/caterer\/followup-settings/, ["parties", "parties.followup"]],
];

// Which Excel download belongs to which page
const EXPORT_KEY: Record<string, string> = { daybook: "daybook", purchases: "purchases", expenses: "expenses", sales: "reports", balances: "reports", items: "reports", functions: "reports", customers: "reports" };

// Every key that must be open for this request. `write` adds the page's read-only key.
export function keysForRequest(pathname: string, method = "GET", search?: URLSearchParams): string[] {
  if (pathname === "/api/caterer/export") return [EXPORT_KEY[search?.get("type") ?? "daybook"] ?? "reports"];
  const hit = RULES.find(([re]) => re.test(pathname));
  if (!hit) return [];
  const keys = [...hit[1]];
  if (keys[0] === "reports" && search?.get("tab")) keys.push(`reports.${search.get("tab")}`);
  if (method !== "GET" && method !== "HEAD" && keys.length && keys[0] !== "__owner") keys.push(`ro.${keys[0]}`);
  return keys;
}

export const isAllowed = (deny: readonly string[] | undefined, keys: string[]) => !deny?.length || !keys.some((k) => deny.includes(k));

// For menus and tabs: can this person open that address?
export function canOpen(deny: readonly string[] | undefined, href: string) {
  const [path, query] = href.split("?");
  return isAllowed(deny, keysForRequest(path, "GET", new URLSearchParams(query ?? "")));
}

// Where to send someone whose first stop is hidden from them
export const FIRST_STOPS = ["/caterer/dashboard", "/caterer/calendar", "/caterer/orders", "/caterer/daybook", "/caterer/purchases", "/caterer/expenses", "/caterer/reports", "/caterer/customers", "/caterer/items", "/caterer/profile", "/caterer/messages"];
export const firstAllowedPage = (deny: readonly string[] | undefined) => FIRST_STOPS.find((p) => canOpen(deny, p)) ?? null;
