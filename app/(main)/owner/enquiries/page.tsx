import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, MessageCircle, Phone } from "lucide-react";
import { getSession } from "@/lib/session";
import { closedRequests, pendingRequests } from "@/lib/owner-pending";
import { PendingRequests } from "@/components/pending-requests";
import { cn } from "@/lib/utils";

const day = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default async function OwnerEnquiriesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/login");
  if (!session.orgId) redirect("/owner/onboarding");

  const past = (await searchParams).tab === "past";
  const [waiting, closed] = await Promise.all([pendingRequests(session.orgId), closedRequests(session.orgId)]);
  const hidePhones = !!session.deny?.includes("hide.phones");

  const tabs = [
    { key: "waiting", label: "Waiting", count: waiting.length, href: "/owner/enquiries" },
    { key: "past", label: "Past requests", count: closed.length, href: "/owner/enquiries?tab=past" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Enquiries</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Customers who asked to book a date. When you approve one, it moves to Bookings and Customers. The date is held for them until you decide.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const on = (t.key === "past") === past;
          return (
            <Link key={t.key} href={t.href} aria-current={on ? "page" : undefined}
              className={cn("rounded-xl px-3 py-1.5 text-sm font-medium", on ? "bg-amber-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400")}>
              {t.label} <span className="opacity-70">{t.count}</span>
            </Link>
          );
        })}
      </div>

      {!past && (waiting.length > 0 ? <PendingRequests bookings={waiting} /> : (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-500">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
          No enquiries waiting. When a customer presses Request to Book, it shows up here.
        </div>
      ))}

      {past && (closed.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center text-sm text-zinc-500">Nothing here. Requests you reject, or that nobody answered, are kept here.</div>
      ) : (
        <ul className="space-y-3">
          {closed.map((r) => {
            const digits = r.phone.replace(/\D/g, "").slice(-10);
            return (
              <li key={r.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{r.name}</p>
                    <p className="text-xs text-zinc-500">{r.hall} · {day(r.eventDate)} · {r.slot} · asked on {day(r.requestedOn)}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", r.rejected ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400")}>{r.rejected ? "Rejected" : "No reply"}</span>
                </div>
                {r.reason && <p className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">{r.reason}</p>}
                {!hidePhones && digits.length === 10 && (
                  <div className="flex flex-wrap gap-2">
                    <a href={`tel:+91${digits}`} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white"><Phone className="h-4 w-4" /> {digits}</a>
                    <a href={`https://wa.me/91${digits}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}
