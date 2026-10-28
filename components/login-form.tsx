"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "login" | "forgot" | "forgot-sent";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");

  // Login state
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot password state
  const [fpPhone, setFpPhone] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");
  const [devPassword, setDevPassword] = useState<string | null>(null);

  function redirectByRole(role: string) {
    if (role === "OWNER") router.push("/owner/dashboard");
    else if (role === "CATERER") router.push("/caterer/dashboard");
    else if (role === "ADMIN") router.push("/admin");
    else router.push("/");
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid phone number or password"); return; }
      redirectByRole(data.role);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (fpLoading) return;
    setFpError("");
    setFpLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fpPhone }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.devPassword) setDevPassword(data.devPassword);
      setStep("forgot-sent");
    } finally {
      setFpLoading(false);
    }
  }

  // ── Forgot password sent ──────────────────────────────────
  if (step === "forgot-sent") {
    return (
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto">
          <CheckCircle className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">New password sent!</p>
          <p className="text-sm text-zinc-500 mt-1">
            If an account exists for +91{fpPhone}, a new password has been sent via WhatsApp and email.
          </p>
        </div>
        {devPassword && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-left">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Dev mode — new password</p>
            <p className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-50">{devPassword}</p>
            <p className="text-[10px] text-zinc-400 mt-1">Not shown in production. Configure SMTP/Twilio in .env to send real notifications.</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => { setStep("login"); setPhone(fpPhone); setPassword(devPassword ?? ""); setDevPassword(null); setFpPhone(""); }}
          className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  // ── Forgot password form ──────────────────────────────────
  if (step === "forgot") {
    return (
      <form onSubmit={handleForgot} className="space-y-4">
        <div>
          <p className="text-sm text-zinc-500 mb-3">
            Enter your registered phone number. We'll send a new password via WhatsApp and email.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="fp-phone">Registered phone number</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-200 bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-500 text-sm">
              +91
            </span>
            <Input
              id="fp-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
              value={fpPhone}
              onChange={(e) => setFpPhone(e.target.value.replace(/\D/g, ""))}
              className="rounded-l-none"
              autoFocus
            />
          </div>
        </div>
        {fpError && <p className="text-sm text-red-500">{fpError}</p>}
        <button
          type="submit"
          disabled={fpLoading || fpPhone.length < 10}
          className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {fpLoading ? "Sending…" : "Send new password →"}
        </button>
        <button
          type="button"
          onClick={() => { setStep("login"); setFpError(""); }}
          className="w-full py-2.5 px-4 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-sm transition-colors"
        >
          ← Back to sign in
        </button>
      </form>
    );
  }

  // ── Login form ────────────────────────────────────────────
  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="phone">Phone number</Label>
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-200 bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-500 text-sm">
            +91
          </span>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            className="rounded-l-none"
            autoFocus
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={() => { setStep("forgot"); setFpPhone(phone); setError(""); }}
            className="text-xs text-amber-600 hover:underline font-medium"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPw ? "text" : "password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || phone.length < 10 || password.length === 0}
        className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in…" : "Sign in →"}
      </button>

      <div className="text-center space-y-2 pt-1">
        <p className="text-xs text-zinc-400">Want to list your venue or catering?</p>
        <div className="flex items-center justify-center gap-4">
          <a href="/apply/venue" className="text-xs text-amber-600 hover:underline font-medium">
            Add convention center →
          </a>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <a href="/apply/caterer" className="text-xs text-amber-600 hover:underline font-medium">
            Add catering service →
          </a>
        </div>
      </div>
    </form>
  );
}
