import { connection } from "next/server";
export const instant = false;
import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { VenueCard } from "@/components/venue-card";
import { CatererCard } from "@/components/caterer-card";
import { db } from "@/lib/db";
import { Building2, UtensilsCrossed, CheckCircle2 } from "lucide-react";

type Props = { searchParams: Promise<{ city?: string; guests?: string; date?: string; type?: string }> };

const TYPE_KEYWORDS: Record<string, string[]> = {
  convention: ["convention", "conference", "civic"],
  auditorium: ["auditorium", "auditoreum"],
  banquet: ["banquet", "kalyana", "marriage", "reception"],
  wedding: ["wedding", "kalyana", "marriage", "bridal"],
};

export default async function HomePage({ searchParams }: Props) {
  await connection();
  const sp = await searchParams;
  const isFiltering = !!(sp.city || sp.guests || sp.date || sp.type);

  const [venues, caterers] = await Promise.all([
    db.venue.findMany({
      where: {
        approved: true,
        org: { disabled: false },
        ...(sp.city ? { city: { contains: sp.city, mode: "insensitive" } } : {}),
        ...(sp.guests
          ? { halls: { some: { capacity: { gte: parseInt(sp.guests) } } } }
          : {}),
        ...(sp.type && TYPE_KEYWORDS[sp.type]
          ? {
              OR: TYPE_KEYWORDS[sp.type].map((kw) => ({
                name: { contains: kw, mode: "insensitive" },
              })),
            }
          : {}),
      },
      include: {
        halls: {
          select: {
            id: true,
            name: true,
            capacity: true,
            pricePerSlot: true,
            amenities: true,
            photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
          },
          orderBy: { capacity: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.caterer.findMany({
      where: { approved: true, disabled: false },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-amber-500 to-orange-400">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-orange-600/15 pointer-events-none" />
        <div className="absolute top-8 left-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-28 sm:pt-20 sm:pb-32">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-3.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-semibold">Kerala's hall & catering marketplace</span>
            </div>
            <h1 className="leading-tight">
              <span className="block text-5xl sm:text-6xl font-bold text-white mb-2" style={{ fontFamily: "'Manjari', sans-serif" }}>Virunnu</span>
              <span className="block text-2xl sm:text-3xl font-semibold text-white/90">Your perfect venue,<br />just a search away</span>
            </h1>
            <p className="text-white/85 text-lg leading-relaxed max-w-lg">
              Browse convention halls, auditoriums, and banquet spaces across Kerala —
              check availability and book instantly, without signing in.
            </p>
          </div>
        </div>
      </div>

      {/* ── Search card (overlaps hero) ───────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 -mt-16 relative z-10 mb-10">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-5 sm:p-6">
          <SearchForm defaults={{ city: sp.city, guests: sp.guests, date: sp.date, type: sp.type }} />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 space-y-14">

        {/* ── Venues ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {isFiltering ? "Matching venues" : "Convention halls & venues"}
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                {isFiltering
                  ? `${venues.length} result${venues.length !== 1 ? "s" : ""} found`
                  : "Auditoriums, banquet halls & convention centers across Kerala"}
              </p>
            </div>
            {venues.length > 0 && (
              <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                {venues.length} {venues.length === 1 ? "venue" : "venues"}
              </span>
            )}
          </div>

          {venues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
              <Building2 className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium">No venues found</p>
              <p className="text-sm text-zinc-400 mt-1">Try a different city or remove filters</p>
              <Link href="/" className="mt-4 inline-block text-sm font-semibold text-amber-600 hover:underline">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((v) => (
                <VenueCard key={v.id} venue={v} />
              ))}
            </div>
          )}
        </section>

        {/* ── Catering ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-start gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Catering services
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                Reach out directly — discuss menus, pricing and availability
              </p>
            </div>
          </div>

          {caterers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-10 text-center">
              <UtensilsCrossed className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">No catering services listed yet</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {caterers.map((c) => (
                <CatererCard key={c.id} caterer={c} />
              ))}
            </div>
          )}
        </section>

        {/* ── List with us ─────────────────────────────────────── */}
        <section>
          <div className="mb-5 text-center">
            <div className="inline-block bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3">
              For service providers
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Grow your business with Virunnu
            </h2>
            <p className="text-zinc-500 mt-1.5 max-w-lg mx-auto text-sm">
              Join Kerala&apos;s growing network of halls and catering services.
              Get discovered by thousands of families planning their events.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Convention Hall CTA */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mb-5">
                <Building2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                I own a Convention Hall
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed flex-1">
                List your convention center, auditorium, or banquet hall.
                Set your hall details, slot schedules, and pricing — then let
                customers book directly through Virunnu.
              </p>
              <ul className="mt-4 space-y-2 mb-6">
                {["Instant online bookings", "Manage your calendar & slots", "Advance payment collection", "Customer booking history"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/apply/venue"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-5 py-2.5 text-sm font-bold text-white transition-colors"
              >
                Add my venue →
              </Link>
            </div>

            {/* Caterer CTA */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center mb-5">
                <UtensilsCrossed className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                I offer Catering Services
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed flex-1">
                Showcase your catering business — Kerala sadya, multi-cuisine,
                wedding catering and more. Reach families planning events across Kerala
                and let them contact you directly.
              </p>
              <ul className="mt-4 space-y-2 mb-6">
                {["Get discovered by event planners", "Showcase your menu & specialties", "Direct call & WhatsApp enquiries", "Free to list your services"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/apply/caterer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 px-5 py-2.5 text-sm font-bold text-white transition-colors"
              >
                Add my catering →
              </Link>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">How it works</h2>
            <p className="text-sm text-zinc-500 mt-1">Book your venue in three simple steps</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { num: "01", title: "Search & filter", desc: "Browse venues by city, date, and guest count. No login needed to explore." },
              { num: "02", title: "Check availability", desc: "View real-time slot calendar, pricing, and hall photos on the venue page." },
              { num: "03", title: "Confirm & pay", desc: "Log in with your phone number and complete your booking with a secure advance payment." },
            ].map((step) => (
              <div key={step.num} className="space-y-2">
                <div className="text-3xl font-bold text-amber-400/60">{step.num}</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-50">{step.title}</div>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
