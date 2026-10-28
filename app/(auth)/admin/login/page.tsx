import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata = { title: "Admin Login — Virunnu" };

const FEATURES = [
  { icon: "🏛", label: "Convention Centers", desc: "Approve, manage & monitor all registered convention centers" },
  { icon: "🍽", label: "Caterers", desc: "Oversee catering partners and their service listings" },
  { icon: "📋", label: "New Requests", desc: "Review and action sign-up applications from owners" },
  { icon: "📊", label: "Platform Activity", desc: "Full visibility into bookings, customers and revenue" },
];

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel ───────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #0f0f10 0%, #18181b 50%, #1c1917 100%)" }}
      >
        {/* Ambient glow circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(245,158,11,0.10)" }} />
        <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] rounded-full blur-3xl" style={{ background: "rgba(245,158,11,0.07)" }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full blur-2xl -translate-y-1/2" style={{ background: "rgba(180,83,9,0.06)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <span className="text-amber-400 font-black text-sm">V</span>
            </div>
            <span className="text-white font-bold text-base tracking-tight">Virunnu</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-amber-400 text-xs font-semibold tracking-widest uppercase">Platform Admin</span>
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
              Manage the<br />
              <span style={{ color: "#fbbf24" }}>entire platform</span><br />
              from one place
            </h2>
            <p className="text-sm" style={{ color: "#71717a", lineHeight: 1.7 }}>
              Full control over convention centers, caterers,<br />sign-up requests and platform activity.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-lg leading-none mt-0.5 shrink-0">{f.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-white mb-0.5">{f.label}</div>
                  <div className="text-xs" style={{ color: "#71717a", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: "#52525b" }}>Kerala&apos;s convention &amp; catering marketplace</p>
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-zinc-50 dark:bg-zinc-950">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-400/20 flex items-center justify-center">
              <span className="text-amber-500 font-black text-xs">V</span>
            </div>
            <span className="font-bold text-zinc-900 dark:text-zinc-50 text-base">Virunnu</span>
          </div>
          <div className="text-[11px] text-zinc-400 tracking-widest uppercase">Platform Admin</div>
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1.5">Welcome back</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sign in to access the admin dashboard.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <AdminLoginForm />
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <a href="/" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
