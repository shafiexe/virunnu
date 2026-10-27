"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.status === 401) {
      setError("Invalid credentials.");
      return;
    }
    if (!res.ok) {
      setError("Something went wrong. Try again.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          placeholder="admin"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || !username || !password}
        className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in…" : "Sign in →"}
      </button>
    </form>
  );
}
