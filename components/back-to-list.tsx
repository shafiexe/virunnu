"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Goes back in history when the visitor came from the list, so its filters and page are kept.
export function BackToList({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (typeof window !== "undefined" && window.history.length > 1 && document.referrer.includes(href)) {
          e.preventDefault();
          router.back();
        }
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
