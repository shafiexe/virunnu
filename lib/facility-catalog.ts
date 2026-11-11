// Mirror of facilities-manager CATALOG for server-side matching
export const FACILITY_CATALOG = [
  { name: "Air Conditioning", category: "VENUE",      icon: "ac_unit",          description: "Full AC coverage for all guests" },
  { name: "Parking",          category: "PARKING",    icon: "local_parking",    description: "Dedicated vehicle parking area" },
  { name: "Wi-Fi",            category: "VENUE",      icon: "wifi",             description: "High-speed wireless internet" },
  { name: "Generator",        category: "VENUE",      icon: "local_gas_station",description: "Diesel generator for power backup" },
  { name: "Backup Power / UPS",category:"VENUE",      icon: "backup",           description: "Uninterrupted power supply" },
  { name: "CCTV",             category: "VENUE",      icon: "tv",               description: "24/7 security surveillance cameras" },
  { name: "Security Guard",   category: "SERVICES",   icon: "security",         description: "On-site security personnel" },
  { name: "Kitchen",          category: "SERVICES",   icon: "kitchen",          description: "Fully equipped catering kitchen" },
  { name: "Stage & Decor",    category: "DECORATION", icon: "celebration",      description: "Elevated stage with backdrop" },
  { name: "Sound System",     category: "AV",         icon: "speaker",          description: "Professional PA with microphones" },
  { name: "Projector & Screen",category:"AV",         icon: "videocam",         description: "HD projector with large screen" },
  { name: "Garden / Lawn",    category: "VENUE",      icon: "park",             description: "Open outdoor lawn space" },
  { name: "Catering Service", category: "SERVICES",   icon: "restaurant",       description: "In-house food and beverage service" },
  { name: "Flower Decoration",category: "DECORATION", icon: "local_florist",    description: "Floral arrangements and bouquets" },
  { name: "Photography",      category: "MEDIA",      icon: "photo_camera",     description: "Professional event photographer" },
  { name: "Extra Seating",    category: "VENUE",      icon: "chair",            description: "Additional chairs and tables" },
  { name: "Accessibility",    category: "VENUE",      icon: "accessible",       description: "Ramps and accessible facilities" },
  { name: "Bike Parking",     category: "PARKING",    icon: "two_wheeler",      description: "Two-wheeler parking area" },
  { name: "Beverages Counter",category: "SERVICES",   icon: "local_bar",        description: "Soft drinks, tea and coffee station" },
  { name: "Event Coordination",category:"SERVICES",   icon: "event",            description: "On-site event coordinator" },
  { name: "Valet Parking",    category: "PARKING",    icon: "local_parking",    description: "Attendant-managed valet service" },
  { name: "WiFi Access",      category: "SERVICES",   icon: "wifi",             description: "High-speed internet for guests" },
] as const;

const KEYWORD_MAP: [string, string][] = [
  ["air condition", "Air Conditioning"], ["ac", "Air Conditioning"], ["a/c", "Air Conditioning"],
  ["parking", "Parking"],
  ["wi-fi", "Wi-Fi"], ["wifi", "Wi-Fi"], ["internet", "Wi-Fi"],
  ["generator", "Generator"], ["genset", "Generator"], ["dg set", "Generator"],
  ["ups", "Backup Power / UPS"], ["backup power", "Backup Power / UPS"],
  ["cctv", "CCTV"], ["surveillance", "CCTV"], ["camera", "CCTV"],
  ["security", "Security Guard"], ["guard", "Security Guard"],
  ["kitchen", "Kitchen"], ["catering kitchen", "Kitchen"],
  ["stage", "Stage & Decor"], ["decor", "Stage & Decor"],
  ["sound", "Sound System"], ["pa system", "Sound System"], ["audio", "Sound System"], ["microphone", "Sound System"],
  ["projector", "Projector & Screen"], ["led screen", "Projector & Screen"],
  ["lawn", "Garden / Lawn"], ["garden", "Garden / Lawn"], ["outdoor", "Garden / Lawn"],
  ["catering", "Catering Service"], ["restaurant", "Catering Service"],
  ["flower", "Flower Decoration"], ["floral", "Flower Decoration"],
  ["photo", "Photography"], ["photographer", "Photography"],
  ["seating", "Extra Seating"], ["chairs", "Extra Seating"],
  ["wheelchair", "Accessibility"], ["ramp", "Accessibility"],
  ["bike", "Bike Parking"], ["two-wheeler", "Bike Parking"], ["motorbike", "Bike Parking"],
  ["beverage", "Beverages Counter"], ["tea", "Beverages Counter"], ["coffee", "Beverages Counter"],
  ["coordinator", "Event Coordination"], ["event management", "Event Coordination"],
  ["valet", "Valet Parking"],
];

function keywordHits(lower: string, kw: string) {
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Short keywords ("ac", "ups", "tea") must be whole words, otherwise "Generator Backup" matches "ac".
  const re = kw.length <= 3 ? new RegExp(`(^|[^a-z0-9])${esc}($|[^a-z0-9])`) : new RegExp(`(^|[^a-z0-9])${esc}`);
  return re.test(lower);
}

export function matchAmenities(names: string[]): typeof FACILITY_CATALOG[number][] {
  const matched = new Set<string>();
  for (const name of names) {
    const lower = name.toLowerCase();
    const direct = FACILITY_CATALOG.find((c) => c.name.toLowerCase() === lower);
    if (direct) { matched.add(direct.name); continue; }
    for (const [kw, catalogName] of KEYWORD_MAP) {
      if (keywordHits(lower, kw)) { matched.add(catalogName); break; }
    }
  }
  return [...FACILITY_CATALOG].filter((c) => matched.has(c.name));
}

export type FacilityDraft = { name: string; description: string | null; category: string; icon: string; isCustom: boolean };

// Catalog facilities for recognised amenities; anything else becomes a custom facility so nothing the admin selected is lost.
export function buildFacilities(names: string[]): FacilityDraft[] {
  const catalog: FacilityDraft[] = matchAmenities(names).map((c) => ({
    name: c.name, description: c.description, category: c.category, icon: c.icon, isCustom: false,
  }));
  const have = new Set(catalog.map((c) => c.name.toLowerCase()));
  const custom: FacilityDraft[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name || matchAmenities([name]).length > 0 || have.has(name.toLowerCase())) continue;
    have.add(name.toLowerCase());
    custom.push({ name, description: null, category: "GENERAL", icon: "⚡", isCustom: true });
  }
  return [...catalog, ...custom];
}
