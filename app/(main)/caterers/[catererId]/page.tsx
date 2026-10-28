import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MapPin, Phone, Globe, Link2 } from "lucide-react";
import { CatererEnquiryForm } from "@/components/caterer-enquiry-form";

const SERVICE_LABELS: Record<string, string> = {
  FOOD: "🍽️ Food & Catering",
  DECORATION: "🌸 Decoration",
  SERVING_STAFF: "🧑‍🍳 Serving Staff",
  TENT_SHAMIANA: "⛺ Tent / Shamiana",
  SOUND_LIGHT: "🎤 Sound & Lighting",
  TRANSPORT: "🚐 Transport",
};

const CATEGORY_ORDER = [
  "Kerala Sadhya", "Breakfast", "Lunch", "Dinner", "Snacks & Tea",
  "Rice & Biryani", "Starters", "Breads", "Desserts & Sweets", "Beverages", "Special Package",
];

export default async function CatererPublicPage({
  params,
}: {
  params: Promise<{ catererId: string }>;
}) {
  const { catererId } = await params;

  const caterer = await db.caterer.findUnique({
    where: { id: catererId },
    include: { menuItems: { orderBy: { category: "asc" } } },
  });

  if (!caterer || !caterer.approved || caterer.disabled) notFound();

  // Group menu items by category
  const grouped: Record<string, typeof caterer.menuItems> = {};
  for (const item of caterer.menuItems) {
    const cat = item.category ?? "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const sortedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const contactPhone = caterer.whatsappNumber || caterer.phone;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Photos */}
      {caterer.photos.length > 0 && (
        <div className={`grid gap-2 ${caterer.photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {caterer.photos.slice(0, 4).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={i} className={`rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${i === 0 && caterer.photos.length > 1 ? "col-span-2" : ""}`}>
              <img src={url} alt="" className="w-full h-48 object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{caterer.name}</h1>
        <div className="flex items-center gap-1 text-zinc-500 text-sm">
          <MapPin className="h-4 w-4" /> {caterer.city}, Kerala
        </div>
        {caterer.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{caterer.description}</p>
        )}
      </div>

      {/* Services */}
      {caterer.services.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {caterer.services.map((s) => (
            <span key={s} className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              {SERVICE_LABELS[s] ?? s}
            </span>
          ))}
        </div>
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
        {caterer.websiteUrl && (
          <a href={caterer.websiteUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 hover:text-amber-600 transition-colors">
            <Globe className="h-3.5 w-3.5" /> Website
          </a>
        )}
      </div>

      {/* Enquiry form */}
      <CatererEnquiryForm catererId={caterer.id} catererName={caterer.name} contactPhone={contactPhone} />

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
                      ₹{item.priceRupees.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
