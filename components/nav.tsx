"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SessionInfo = { role: string } | null;

export function NavUser() {
  const [session, setSession] = useState<SessionInfo | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    window.location.href = "/";
  }

  if (session === undefined) return null;

  if (!session) {
    return (
      <div className="hidden md:flex items-center gap-2">
        <Link href="/apply/venue" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          Add your venue
        </Link>
        <Link href="/login" className="text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-4 py-1.5 rounded-lg transition-colors">
          Sign in
        </Link>
      </div>
    );
  }

  const navLink = "text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors";

  return (
    <div className="hidden md:flex items-center gap-1">
      {session.role === "OWNER" && (
        <Link href="/owner/dashboard" className={navLink}>Dashboard</Link>
      )}
      {session.role === "CATERER" && (
        <Link href="/caterer/dashboard" className={navLink}>Dashboard</Link>
      )}
      {session.role === "ADMIN" && (
        <Link href="/admin" className={navLink}>Admin</Link>
      )}
      {session.role === "CUSTOMER" && (
        <Link href="/bookings" className={navLink}>My bookings</Link>
      )}
      <button
        onClick={logout}
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ml-1"
      >
        Logout
      </button>
    </div>
  );
}
