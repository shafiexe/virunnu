import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata = { title: "Admin Login — Virunnu" };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #18181b 0%, #27272a 60%, #3f3f46 100%)" }}
      >
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full" style={{ background: "rgba(245,158,11,0.08)" }} />
        <div className="absolute -bottom-28 -right-28 w-96 h-96 rounded-full" style={{ background: "rgba(245,158,11,0.05)" }} />

        <div className="relative z-10 text-center text-white max-w-xs space-y-8">
          <div>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Virunnu Admin
            </div>
            <div style={{ fontSize: "0.8rem", color: "#a1a1aa", marginTop: "0.35rem", letterSpacing: "0.1em" }}>
              PLATFORM MANAGEMENT
            </div>
          </div>

          <p style={{ fontSize: "0.9rem", color: "#a1a1aa", lineHeight: 1.6 }}>
            Approve venues, manage caterers, and oversee all platform activity from one place.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-zinc-950">
        <div className="lg:hidden mb-8 text-center">
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#18181b" }} className="dark:text-zinc-50">
            Virunnu Admin
          </div>
          <div style={{ fontSize: "0.7rem", color: "#a1a1aa", letterSpacing: "0.15em", marginTop: "0.2rem" }}>
            PLATFORM MANAGEMENT
          </div>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Admin sign in</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Access restricted to platform administrators only.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <AdminLoginForm />
          </div>

          <div className="text-center">
            <a
              href="/"
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
