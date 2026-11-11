import Link from "next/link";
import { cn } from "@/lib/utils";

// Small tab strip that joins pages sharing one menu item (customers | suppliers, purchases | expenses).
export function CatererSectionTabs({ tabs, active }: { tabs: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
            active === t.key ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export const partyTabs = () => [
  { key: "customers", label: "Customers", href: "/caterer/customers" },
  { key: "followup", label: "Follow-up", href: "/caterer/followup" },
  { key: "suppliers", label: "Suppliers", href: "/caterer/suppliers" },
  { key: "staff", label: "Staff", href: "/caterer/staff" },
];
export const PARTY_TABS = partyTabs();
export const orderTabs = (pending: number) => [
  { key: "orders", label: "Orders", href: "/caterer/orders" },
  { key: "enquiries", label: pending > 0 ? `Enquiries (${pending})` : "Enquiries", href: "/caterer/enquiries" },
  { key: "quotes", label: "Quotations", href: "/caterer/quotes" },
];
