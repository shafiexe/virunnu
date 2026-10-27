import { LoginForm } from "@/components/login-form";
import { HeroBackground } from "@/components/hero-background";
import { VirunnuLogo } from "@/components/virunnu-logo";
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

      {/* ── Left brand panel ──────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-center p-14 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #D97706 0%, #C96A20 55%, #DB5F2E 100%)" }}
      >
        <HeroBackground />

        {/* Ambient blobs */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-black/[0.07] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-52 h-52 rounded-full bg-black/[0.05] pointer-events-none" />

        <div className="relative z-10 text-white max-w-sm space-y-8">

          {/* Brand lockup — matches image 4 in brand guide */}
          <div className="space-y-2">
            <VirunnuLogo fontSize={52} vColor="white" flameColor="#F0A010" textColor="white" />
            <div
              className="text-white/80 text-xl"
              style={{ fontFamily: "'Manjari', sans-serif", fontWeight: 700 }}
            >
              വിരുന്ന്
            </div>
            <div className="text-white/55 text-[11px] font-semibold tracking-[0.22em]">
              VENUES · CATERING · CELEBRATIONS
            </div>
          </div>

          {/* Divider */}
          <div className="w-12 h-px bg-white/30" />

          {/* Feature list */}
          <div className="space-y-5">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="h-[17px] w-[17px] text-white" />
                </div>
                <div className="pt-0.5">
                  <p className="font-semibold text-sm text-white leading-snug">{title}</p>
                  <p className="text-white/55 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/35 text-xs">Trusted by families across Kerala</p>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-zinc-950">

        {/* Mobile brand */}
        <div className="lg:hidden mb-10 text-center space-y-1">
          <VirunnuLogo fontSize={34} />
          <p className="text-[11px] text-zinc-400 tracking-[0.18em] uppercase mt-2">
            Kerala's hall booking platform
          </p>
        </div>

        <div className="w-full max-w-sm">

          {/* Amber accent bar */}
          <div className="w-8 h-1 rounded-full mb-7" style={{ background: "#D97706" }} />

          <div className="mb-8 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#2A1505" }}>
              Welcome back
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sign in with your phone number and password.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <LoginForm />
          </div>

          <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mb-5">
            By continuing, you agree to our{" "}
            <a href="/terms" className="hover:underline font-medium" style={{ color: "#D97706" }}>Terms</a>
            {" & "}
            <a href="/privacy" className="hover:underline font-medium" style={{ color: "#D97706" }}>Privacy Policy</a>.
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
