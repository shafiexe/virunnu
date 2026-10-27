import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Sign in — Virunnu" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — amber brand panel, desktop only */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #fb923c 60%, #ea580c 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
        <div className="absolute -bottom-28 -right-28 w-96 h-96 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="absolute top-1/4 right-8 w-40 h-40 rounded-full" style={{ background: "rgba(0,0,0,0.08)" }} />

        <div className="relative z-10 text-center text-white max-w-xs space-y-8">
          {/* Brand */}
          <div>
            <div style={{ fontSize: "3.5rem", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              വിരുന്ന്
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, opacity: 0.85, marginTop: "0.25rem", letterSpacing: "0.1em" }}>
              VIRUNNU
            </div>
          </div>

          <p style={{ fontSize: "1rem", opacity: 0.9, lineHeight: 1.6 }}>
            Kerala's premier platform for booking convention halls, wedding venues, and celebration spaces.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[["500+", "Venues"], ["50K+", "Bookings"], ["Kerala", "Wide"]].map(([n, l]) => (
              <div
                key={l}
                style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", borderRadius: "0.75rem", padding: "0.75rem 0.5rem" }}
              >
                <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{n}</div>
                <div style={{ fontSize: "0.7rem", opacity: 0.75, marginTop: "0.1rem" }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ opacity: 0.6, fontSize: "0.75rem" }}>
            Trusted by families across Kerala
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-zinc-950">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f59e0b" }}>വിരുന്ന്</div>
          <div style={{ fontSize: "0.7rem", color: "#a1a1aa", letterSpacing: "0.15em", marginTop: "0.2rem" }}>
            KERALA'S HALL BOOKING PLATFORM
          </div>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Welcome back</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sign in with your phone number and password.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
            <LoginForm />
          </div>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
            By continuing, you agree to our{" "}
            <a href="#" className="text-amber-500 hover:text-amber-600 font-medium">Terms</a>
            {" & "}
            <a href="#" className="text-amber-500 hover:text-amber-600 font-medium">Privacy Policy</a>.
          </p>

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
