"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Clock, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

type OwnerApp = {
  id: string;
  orgName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  website: string | null;
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

function AppCard({
  name, phone, email, address, city, website, cuisines, status,
  onApprove, onReject,
}: {
  name: string; phone: string; email: string; address: string; city: string;
  website?: string | null; cuisines?: string[]; status: ApplicationStatus;
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
        </div>

        {isPending && (
          <div className="flex items-center gap-2 shrink-0">
            {!showReject ? (
              <>
                <button
                  onClick={async () => { setLoadingApprove(true); await onApprove(); setLoadingApprove(false); }}
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
                  onClick={async () => { setLoadingReject(true); await onReject(rejectReason); setLoadingReject(false); }}
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
        <p className="text-sm text-zinc-500 mt-0.5">Review and approve venue owner and caterer registrations.</p>
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
              onApprove={() => approveCaterer(a.id)}
              onReject={(reason) => rejectCaterer(a.id, reason)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
