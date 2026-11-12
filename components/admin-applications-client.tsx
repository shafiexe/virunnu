"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

type OwnerApp = {
  id: string;
  orgName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  website: string | null;
  details: unknown;
  status: ApplicationStatus;
  notes: string | null;
  createdAt: Date;
};

type CatererApp = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  cuisines: string[];
  website: string | null;
  details: unknown;
  status: ApplicationStatus;
  notes: string | null;
  createdAt: Date;
};

type Credentials = { phone: string; password: string };

function CredentialsBanner({ creds, onDismiss }: { creds: Credentials; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(`Phone: ${creds.phone}\nPassword: ${creds.password}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          ✅ Application approved — credentials generated
        </p>
        <button onClick={onDismiss} className="text-xs text-zinc-400 hover:text-zinc-600">Dismiss</button>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-emerald-100 dark:border-emerald-900 p-3 font-mono text-sm space-y-1">
        <p><span className="text-zinc-400">Phone:    </span><span className="text-zinc-800 dark:text-zinc-200">{creds.phone}</span></p>
        <p><span className="text-zinc-400">Password: </span><span className="text-zinc-800 dark:text-zinc-200">{creds.password}</span></p>
      </div>
      <p className="text-xs text-emerald-700 dark:text-emerald-400">
        Credentials have been sent via WhatsApp and email. Copy them above as a backup.
      </p>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy to clipboard"}
      </button>
    </div>
  );
}

type CenterDetails = {
  venueType?: string; description?: string; hallName?: string; capacity?: number; priceRupees?: number;
  amenities?: string[]; photos?: string[]; slots?: { name: string; startTime: string; endTime: string }[];
  googleMapsUrl?: string; googleRating?: number; googleReviewCount?: number; whatsappPhone?: string;
  instagramUrl?: string; facebookUrl?: string; youtubeUrl?: string; linkedinUrl?: string; twitterUrl?: string;
};

function DetailsPanel({ d }: { d: CenterDetails }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["Maps", d.googleMapsUrl], ["Instagram", d.instagramUrl], ["Facebook", d.facebookUrl],
    ["YouTube", d.youtubeUrl], ["LinkedIn", d.linkedinUrl], ["Twitter / X", d.twitterUrl],
  ].filter(([, u]) => u) as [string, string][];

  return (
    <div className="pt-1">
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-amber-600 hover:underline">
        {open ? "Hide details" : "View full details"}
        {d.photos?.length ? ` · ${d.photos.length} photos` : ""}
      </button>
      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 p-3 text-xs text-zinc-600 dark:text-zinc-400">
          {d.description && <p className="leading-relaxed">{d.description}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {d.venueType && <span>Type: <b className="text-zinc-800 dark:text-zinc-200">{d.venueType.replace(/_/g, " ").toLowerCase()}</b></span>}
            {d.hallName && <span>Hall: <b className="text-zinc-800 dark:text-zinc-200">{d.hallName}</b></span>}
            {d.capacity ? <span>Capacity: <b className="text-zinc-800 dark:text-zinc-200">{d.capacity}</b></span> : null}
            {d.priceRupees ? <span>Price/slot: <b className="text-zinc-800 dark:text-zinc-200">₹{d.priceRupees.toLocaleString("en-IN")}</b></span> : null}
            {d.googleRating ? <span>Rating: <b className="text-zinc-800 dark:text-zinc-200">{d.googleRating}</b>{d.googleReviewCount ? ` (${d.googleReviewCount})` : ""}</span> : null}
            {d.whatsappPhone && <span>WhatsApp: <b className="text-zinc-800 dark:text-zinc-200">{d.whatsappPhone}</b></span>}
          </div>
          {d.slots && d.slots.length > 0 && (
            <div>Slots: {d.slots.map((x) => `${x.name} ${x.startTime}–${x.endTime}`).join(" · ")}</div>
          )}
          {d.amenities && d.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.amenities.map((a) => (
                <span key={a} className="rounded-full border border-zinc-200 dark:border-zinc-700 px-2 py-0.5">{a}</span>
              ))}
            </div>
          )}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {links.map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">{label}</a>
              ))}
            </div>
          )}
          {d.photos && d.photos.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {d.photos.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" referrerPolicy="no-referrer" loading="lazy" className="aspect-[4/3] w-full rounded-md object-cover" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type CatererDetails = {
  description?: string; serviceAreas?: string[]; serviceRadiusKm?: number; minGuests?: number; maxGuests?: number;
  leadTimeHours?: number; mealTypes?: string[]; cuisines?: string[]; services?: string[];
  packages?: { name: string; pricePerPlate: number; isVeg: boolean; dishes: string[] }[];
  items?: { name: string; category?: string; priceRupees: number }[];
  pastEvents?: { title: string; type?: string; guests?: number }[];
  teamSize?: number; yearsExperience?: number; fssaiNumber?: string; googleRating?: number; googleReviewCount?: number;
  googleMapsUrl?: string; instagramUrl?: string; facebookUrl?: string; youtubeUrl?: string; linkedinUrl?: string; twitterUrl?: string;
  photos?: string[];
};

function CatererDetailsPanel({ d }: { d: CatererDetails }) {
  const [open, setOpen] = useState(false);
  const b = (v: string | number) => <b className="text-zinc-800 dark:text-zinc-200">{v}</b>;
  const links = [
    ["Maps", d.googleMapsUrl], ["Instagram", d.instagramUrl], ["Facebook", d.facebookUrl],
    ["YouTube", d.youtubeUrl], ["LinkedIn", d.linkedinUrl], ["Twitter / X", d.twitterUrl],
  ].filter(([, u]) => u) as [string, string][];

  return (
    <div className="pt-1">
      <button onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-amber-600 hover:underline">
        {open ? "Hide details" : "View full details"}
        {d.packages?.length ? ` · ${d.packages.length} packages` : ""}
        {d.photos?.length ? ` · ${d.photos.length} photos` : ""}
      </button>
      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 p-3 text-xs text-zinc-600 dark:text-zinc-400">
          {d.description && <p className="leading-relaxed">{d.description}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {d.serviceAreas?.length ? <span>Serves: {b(d.serviceAreas.join(", "))}</span> : null}
            {d.serviceRadiusKm ? <span>Travels: {b(`${d.serviceRadiusKm} km`)}</span> : null}
            {d.minGuests || d.maxGuests ? <span>Guests: {b(`${d.minGuests ?? "…"}–${d.maxGuests ?? "…"}`)}</span> : null}
            {d.leadTimeHours ? <span>Notice: {b(`${d.leadTimeHours} h`)}</span> : null}
            {d.mealTypes?.length ? <span>Meals: {b(d.mealTypes.join(", ").toLowerCase())}</span> : null}
            {d.teamSize ? <span>Team: {b(d.teamSize)}</span> : null}
            {d.yearsExperience ? <span>Experience: {b(`${d.yearsExperience} yrs`)}</span> : null}
            {d.fssaiNumber ? <span>FSSAI: {b(d.fssaiNumber)}</span> : null}
            {d.googleRating ? <span>Rating: {b(d.googleRating)}{d.googleReviewCount ? ` (${d.googleReviewCount})` : ""}</span> : null}
          </div>
          {d.cuisines?.length ? <div>Cuisines: {b(d.cuisines.join(", "))}</div> : null}
          {d.services?.length ? <div>Services: {b(d.services.map((x) => x.replace(/_/g, " ").toLowerCase()).join(", "))}</div> : null}
          {d.packages && d.packages.length > 0 && (
            <div className="space-y-1">
              {d.packages.map((p) => (
                <div key={p.name}>
                  {b(p.name)} — ₹{p.pricePerPlate}/plate{p.isVeg ? "" : " (non-veg)"}
                  {p.dishes?.length ? <span className="text-zinc-400"> · {p.dishes.join(", ")}</span> : null}
                </div>
              ))}
            </div>
          )}
          {d.items && d.items.length > 0 && <div>{d.items.length} individually priced items</div>}
          {d.pastEvents && d.pastEvents.length > 0 && (
            <div>Past work: {d.pastEvents.map((e) => `${e.title}${e.guests ? ` (${e.guests} guests)` : ""}`).join(" · ")}</div>
          )}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {links.map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">{label}</a>
              ))}
            </div>
          )}
          {d.photos && d.photos.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {d.photos.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" referrerPolicy="no-referrer" loading="lazy" className="aspect-[4/3] w-full rounded-md object-cover" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppCard({
  name, phone, email, address, city, website, cuisines, status, details, kind = "center",
  onApprove, onReject,
}: {
  name: string; phone: string; email: string | null; address: string; city: string;
  website?: string | null; cuisines?: string[]; status: ApplicationStatus; details?: unknown; kind?: "center" | "caterer";
  onApprove: () => Promise<void>; onReject: (reason?: string) => Promise<void>;
}) {
  const [loadingApprove, setLoadingApprove] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isPending = status === "PENDING";

  const STATUS_STYLE: Record<ApplicationStatus, string> = {
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    REJECTED: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  };

  return (
    <div className={cn("rounded-2xl border bg-white dark:bg-zinc-900 p-4", isPending ? "border-zinc-200 dark:border-zinc-800" : "border-zinc-100 dark:border-zinc-800 opacity-70")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">{name}</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_STYLE[status])}>
              {status}
            </span>
          </div>
          <div className="text-sm text-zinc-500">{phone} · {email}</div>
          <div className="text-xs text-zinc-400">{address}, {city}</div>
          {cuisines && cuisines.length > 0 && (
            <div className="text-xs text-zinc-400">{cuisines.join(", ")}</div>
          )}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline">{website}</a>
          )}
          {details && typeof details === "object"
            ? kind === "caterer"
              ? <CatererDetailsPanel d={details as CatererDetails} />
              : <DetailsPanel d={details as CenterDetails} />
            : null}
        </div>

        {isPending && (
          <div className="flex items-center gap-2 shrink-0">
            {!showReject ? (
              <>
                <button
                  onClick={async () => { if (loadingApprove) return; setLoadingApprove(true); try { await onApprove(); } finally { setLoadingApprove(false); } }}
                  disabled={loadingApprove}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {loadingApprove ? "Approving…" : "Approve"}
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-red-300"
                />
                <button
                  onClick={async () => { if (loadingReject) return; setLoadingReject(true); try { await onReject(rejectReason); } finally { setLoadingReject(false); } }}
                  disabled={loadingReject}
                  className="text-xs font-bold text-red-600 hover:underline disabled:opacity-60"
                >
                  {loadingReject ? "…" : "Confirm"}
                </button>
                <button onClick={() => setShowReject(false)} className="text-xs text-zinc-400 hover:text-zinc-600">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminApplicationsClient({
  initialOwnerApps,
  initialCatererApps,
}: {
  initialOwnerApps: OwnerApp[];
  initialCatererApps: CatererApp[];
}) {
  const [ownerApps, setOwnerApps] = useState(initialOwnerApps);
  const [catererApps, setCatererApps] = useState(initialCatererApps);
  const [tab, setTab] = useState<"owner" | "caterer">("owner");
  const [creds, setCreds] = useState<Credentials | null>(null);

  async function approveOwner(id: string) {
    const res = await fetch(`/api/admin/applications/venue/${id}/approve`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setOwnerApps((prev) => prev.map((a) => a.id === id ? { ...a, status: "APPROVED" as ApplicationStatus } : a));
      setCreds({ phone: data.phone, password: data.password });
    }
  }

  async function rejectOwner(id: string, reason?: string) {
    const res = await fetch(`/api/admin/applications/venue/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setOwnerApps((prev) => prev.map((a) => a.id === id ? { ...a, status: "REJECTED" as ApplicationStatus } : a));
    }
  }

  async function approveCaterer(id: string) {
    const res = await fetch(`/api/admin/applications/caterer/${id}/approve`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setCatererApps((prev) => prev.map((a) => a.id === id ? { ...a, status: "APPROVED" as ApplicationStatus } : a));
      setCreds({ phone: data.phone, password: data.password });
    }
  }

  async function rejectCaterer(id: string, reason?: string) {
    const res = await fetch(`/api/admin/applications/caterer/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setCatererApps((prev) => prev.map((a) => a.id === id ? { ...a, status: "REJECTED" as ApplicationStatus } : a));
    }
  }

  const pendingOwners = ownerApps.filter((a) => a.status === "PENDING").length;
  const pendingCaterers = catererApps.filter((a) => a.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Pending Applications</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Review and approve convention center and caterer registrations.</p>
      </div>

      {creds && <CredentialsBanner creds={creds} onDismiss={() => setCreds(null)} />}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
        {([["owner", "Convention Centers", pendingOwners], ["caterer", "Caterers", pendingCaterers]] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === key
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lists */}
      {tab === "owner" && (
        <div className="space-y-2">
          {ownerApps.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
              <Clock className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">No applications yet.</p>
            </div>
          )}
          {ownerApps.map((a) => (
            <AppCard
              key={a.id}
              name={a.orgName}
              phone={a.phone}
              email={a.email}
              address={a.address}
              city={a.city}
              website={a.website}
              status={a.status}
              details={a.details}
              onApprove={() => approveOwner(a.id)}
              onReject={(reason) => rejectOwner(a.id, reason)}
            />
          ))}
        </div>
      )}

      {tab === "caterer" && (
        <div className="space-y-2">
          {catererApps.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
              <Clock className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">No applications yet.</p>
            </div>
          )}
          {catererApps.map((a) => (
            <AppCard
              key={a.id}
              name={a.name}
              phone={a.phone}
              email={a.email}
              address={a.address}
              city={a.city}
              website={a.website}
              cuisines={a.cuisines}
              status={a.status}
              details={a.details}
              kind="caterer"
              onApprove={() => approveCaterer(a.id)}
              onReject={(reason) => rejectCaterer(a.id, reason)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
