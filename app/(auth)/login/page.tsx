import { LoginForm } from "@/components/login-form";
import { HeroBackground } from "@/components/hero-background";
import { Calendar, MapPin, ShieldCheck } from "lucide-react";

export const metadata = { title: "Sign in — Virunnu" };

const FEATURES = [
  {
    Icon: MapPin,
    title: "Browse without signing in",
    desc: "Explore halls, check slots, and see pricing — no account needed.",
  },
  {
    Icon: Calendar,
    title: "Real-time slot availability",
    desc: "Live calendar updated instantly. See what's free on your event date.",
  },
  {
    Icon: ShieldCheck,
    title: "Secure advance booking",
    desc: "Razorpay-powered payments with instant booking confirmation.",
  },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">

      {/* ── Left brand panel — desktop only ───────────────────── */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-center p-14 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #fb923c 55%, #ea580c 100%)" }}
      >
        <HeroBackground />

        {/* Ambient blobs */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/[0.07] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-52 h-52 rounded-full bg-black/[0.06] pointer-events-none" />

        <div className="relative z-10 text-white max-w-sm space-y-10">

          {/* Brand wordmark */}
          <div>
            <span
              className="block text-6xl font-bold leading-none tracking-tight"
              style={{ fontFamily: "'Manjari', sans-serif" }}
            >
              Virunnu
            </span>
            <span className="block text-white/65 text-xs font-semibold tracking-[0.18em] uppercase mt-2.5">
              Kerala's hall &amp; catering marketplace
            </span>
          </div>

          {/* Feature list */}
          <div className="space-y-6">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                  <Icon className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="pt-0.5">
                  <p className="font-semibold text-sm text-white leading-snug">{title}</p>
                  <p className="text-white/60 text-xs mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/40 text-xs">Trusted by families across Kerala</p>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-zinc-950">

        {/* Mobile brand (hidden on desktop) */}
        <div className="lg:hidden mb-10 text-center">
          <span
            className="block text-4xl font-bold text-amber-500"
            style={{ fontFamily: "'Manjari', sans-serif" }}
          >
            Virunnu
          </span>
          <span className="block text-[11px] text-zinc-400 tracking-[0.18em] uppercase mt-1">
            Kerala's hall booking platform
          </span>
        </div>

        <div className="w-full max-w-sm">

          {/* Amber accent */}
          <div className="w-8 h-1 rounded-full bg-amber-400 mb-7" />

          <div className="mb-8 space-y-1">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sign in with your phone number and password.
            </p>
          </div>

          {/* Form */}
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <LoginForm />
          </div>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mb-5">
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-amber-500 hover:text-amber-600 font-medium">Terms</a>
            {" & "}
            <a href="/privacy" className="text-amber-500 hover:text-amber-600 font-medium">Privacy Policy</a>.
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
