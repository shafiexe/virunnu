import { connection } from "next/server";
export const instant = false;
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MapPin, Phone, Globe, Link2, Share2, Star } from "lucide-react";
import { LinkedinIcon, XIcon } from "@/components/social-icons";
import { CatererEnquiryForm } from "@/components/caterer-enquiry-form";
import { orgLogoUrl } from "@/lib/org-logo";
import { toMenuDish } from "@/lib/caterer-items";
import { CatererGallery } from "@/components/caterer-gallery";
import { CatererStickyCta } from "@/components/caterer-sticky-cta";
import { ClampText } from "@/components/clamp-text";
import { ChipRow } from "@/components/chip-row";
import { getAppUrl } from "@/lib/app-url";

const SERVICE_LABELS: Record<string, string> = {
  FOOD: "🍽️ Food & Catering",
  DECORATION: "🌸 Decoration",
  SERVING_STAFF: "🧑‍🍳 Serving Staff",
  TENT_SHAMIANA: "⛺ Tent / Shamiana",
  SOUND_LIGHT: "🎤 Sound & Lighting",
  TRANSPORT: "🚐 Transport",
};

const MEAL_LABELS: Record<string, string> = { BREAKFAST: "Breakfast", LUNCH: "Lunch", DINNER: "Dinner", SNACKS: "Snacks & tea" };

function noticeLabel(h: number) {
  if (h <= 12) return "Same-day orders";
  if (h <= 24) return "1 day notice";
  if (h < 168) return `${Math.round(h / 24)} days notice`;
  return `${Math.round(h / 168)} week notice`;
}

type PastEvent = { title: string; type?: string; guests?: number; note?: string };

const CATEGORY_ORDER = [
  "Packages", "Kerala Sadhya", "Breakfast", "Lunch", "Dinner", "Snacks & Tea",
  "Rice & Biryani", "Starters", "Breads", "Desserts & Sweets", "Beverages", "Special Package",
];

export default async function CatererPublicPage({
  params,
}: {
  params: Promise<{ catererId: string }>;
}) {
  await connection();
  const { catererId } = await params;

  const caterer = await db.caterer.findUnique({
    where: { id: catererId },
  });

  if (!caterer || !caterer.approved || caterer.disabled) notFound();
  const logoUrl = await orgLogoUrl(caterer.orgId);
  // the public menu is the part of the price list the caterer chose to show
  const menuItems = (await db.catererItem.findMany({ where: { catererId: caterer.id, showOnPublic: true, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] })).map(toMenuDish);

  // Group menu items by category
  const grouped: Record<string, typeof menuItems> = {};
  for (const item of menuItems) {
    const cat = item.category ?? "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const sortedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const contactPhone = caterer.whatsappNumber || caterer.phone;
  // what a customer asks first: the price per plate, and how big a group they can serve
  const platePrices = menuItems.filter((m) => m.unit === "plate" && m.priceRupees > 0).map((m) => m.priceRupees);
  const fromPrice = caterer.startingPriceRupees ?? (platePrices.length ? Math.min(...platePrices) : null);
  const guestLine = caterer.minGuests || caterer.maxGuests ? `${caterer.minGuests ?? 1}–${caterer.maxGuests ? caterer.maxGuests.toLocaleString("en-IN") : "any"} guests` : null;
  const pastEvents = Array.isArray(caterer.pastEvents) ? (caterer.pastEvents as PastEvent[]) : [];
  const facts: [string, string][] = [
    caterer.serviceAreas.length ? ["Serves", caterer.serviceAreas.join(", ")] : null,
    caterer.minGuests || caterer.maxGuests ? ["Group size", `${caterer.minGuests ?? 1}–${caterer.maxGuests ?? "any"} guests`] : null,
    caterer.leadTimeHours != null ? ["Booking", noticeLabel(caterer.leadTimeHours)] : null,
    caterer.mealTypes.length ? ["Meals", caterer.mealTypes.map((m) => MEAL_LABELS[m] ?? m).join(", ")] : null,
    caterer.serviceRadiusKm ? ["Travels up to", `${caterer.serviceRadiusKm} km`] : null,
    caterer.teamSize ? ["Team", `${caterer.teamSize} people`] : null,
    caterer.yearsExperience ? ["Experience", `${caterer.yearsExperience} years`] : null,
    caterer.fssaiNumber ? ["FSSAI", caterer.fssaiNumber] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 pb-28 md:pb-8 grid gap-y-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-8">
      {/* Photos: the full width of the page */}
      <div className="lg:col-span-2"><CatererGallery photos={caterer.photos} name={caterer.name} /></div>

      {/* Header */}
      <div className="space-y-2 lg:col-start-1">
        <div className="flex items-center gap-3">
          {logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoUrl} alt={`${caterer.name} logo`} className="h-20 w-20 shrink-0 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white object-contain p-1.5 shadow-sm" />
            : null}
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{caterer.name}</h1>
        </div>
        <div className="flex items-center gap-1 text-zinc-500 text-sm">
          <MapPin className="h-4 w-4" /> {caterer.city}, Kerala
        </div>
        {caterer.googleRating ? (
          <div className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-semibold">{caterer.googleRating}</span>
            {caterer.googleReviewCount ? <span className="text-zinc-400">({caterer.googleReviewCount} Google reviews)</span> : null}
          </div>
        ) : null}
        {(fromPrice || guestLine) && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
            {fromPrice ? <span className="text-lg font-bold text-amber-600 dark:text-amber-400">From ₹{fromPrice.toLocaleString("en-IN")} <span className="text-sm font-medium text-zinc-500">per plate</span></span> : null}
            {guestLine ? <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{guestLine}</span> : null}
          </div>
        )}
        {caterer.description && <ClampText text={caterer.description} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed" />}
      </div>

      {/* Left column on a desktop: facts, services and cuisines */}
      <div className="space-y-6 lg:col-start-1">
      {/* Quick facts */}
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {facts.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 max-w-full">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</div>
              <div className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Services */}
      {caterer.services.length > 0 && (
        <ChipRow show={4} items={caterer.services.map((k) => ({ key: k, label: SERVICE_LABELS[k] ?? k }))}
          chipClass="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800" />
      )}

      {/* Cuisines */}
      {caterer.cuisines.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {caterer.cuisines.map((c) => (
            <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {c}
            </span>
          ))}
        </div>
      )}

      </div>

      {/* Right column on a desktop, sticky: how to reach them and the enquiry form. On a phone it follows the details, as before. */}
      <div className="space-y-4 lg:col-start-2 lg:row-start-2 lg:row-span-3 lg:self-start lg:sticky lg:top-20">
      {/* Contact buttons */}
      <div className="flex flex-wrap gap-3">
        <a
          href={`tel:${caterer.phone}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold text-sm"
        >
          <Phone className="h-4 w-4" /> Call directly
        </a>
        {caterer.whatsappNumber && (
          <a
            href={`https://wa.me/${caterer.whatsappNumber.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors"
          >
            💬 WhatsApp
          </a>
        )}
        <a href={`https://wa.me/?text=${encodeURIComponent(`${caterer.name}: ${getAppUrl()}/caterers/${caterer.id}`)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-emerald-600 transition-colors">
          <Share2 className="h-3.5 w-3.5" /> Share
        </a>
        {caterer.instagramUrl && (
          <a href={caterer.instagramUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-pink-600 transition-colors">
            <Link2 className="h-3.5 w-3.5" /> Instagram
          </a>
        )}
        {caterer.facebookUrl && (
          <a href={caterer.facebookUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-blue-600 transition-colors">
            <Link2 className="h-3.5 w-3.5" /> Facebook
          </a>
        )}
        {caterer.youtubeUrl && (
          <a href={caterer.youtubeUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-red-600 transition-colors">
            <Link2 className="h-3.5 w-3.5" /> YouTube
          </a>
        )}
        {caterer.linkedinUrl && (
          <a href={caterer.linkedinUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-[#0A66C2] transition-colors">
            <LinkedinIcon className="h-3.5 w-3.5" /> LinkedIn
          </a>
        )}
        {caterer.twitterUrl && (
          <a href={caterer.twitterUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <XIcon className="h-3.5 w-3.5" /> Twitter / X
          </a>
        )}
        {caterer.websiteUrl && (
          <a href={caterer.websiteUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-amber-600 transition-colors">
            <Globe className="h-3.5 w-3.5" /> Website
          </a>
        )}
      </div>

      {/* Enquiry form */}
      <div id="enquiry" className="scroll-mt-24"><CatererEnquiryForm catererId={caterer.id} catererName={caterer.name} contactPhone={contactPhone} /></div>

      </div>

      <div className="space-y-6 lg:col-start-1">
      {/* Work done */}
      {pastEvents.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 text-lg">Work we&apos;ve done</h2>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            {pastEvents.map((e, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-900 dark:text-zinc-50">{e.title}{e.type ? <span className="text-zinc-400"> · {e.type}</span> : null}</span>
                {e.guests ? <span className="shrink-0 text-xs text-zinc-500">{e.guests.toLocaleString("en-IN")} guests</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Menu */}
      {sortedCategories.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 text-lg">Menu</h2>
          {sortedCategories.map((cat) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 px-1">{cat}</div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                {grouped[cat].map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 rounded-sm border-2 shrink-0 ${item.isVeg ? "border-emerald-500" : "border-red-500"}`}>
                          <span className={`block w-1.5 h-1.5 rounded-full m-px ${item.isVeg ? "bg-emerald-500" : "bg-red-500"}`} />
                        </span>
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate">{item.name}</span>
                        {item.isSpecial && (
                          <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">
                            ⭐ Special
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-xs text-zinc-500 mt-0.5 ml-5">{item.description}</p>}
                    </div>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm shrink-0">
                      ₹{item.priceRupees.toLocaleString("en-IN")}{item.unit && item.unit !== "nos" ? <span className="text-xs font-normal text-zinc-400"> /{item.unit}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      <CatererStickyCta phone={caterer.phone} whatsapp={caterer.whatsappNumber} />
    </div>
  );
}
