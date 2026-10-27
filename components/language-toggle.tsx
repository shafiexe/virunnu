"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeLang(lang: "ml" | "en") {
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={`flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 text-[11px] font-semibold transition-opacity ${isPending ? "opacity-60" : ""}`}
      title="Change language / ഭാഷ മാറ്റുക"
    >
      <button
        type="button"
        onClick={() => changeLang("ml")}
        className={`px-2 py-0.5 rounded-md transition-colors ${
          locale === "ml"
            ? "bg-amber-500 text-white"
            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        }`}
      >
        മല
      </button>
      <button
        type="button"
        onClick={() => changeLang("en")}
        className={`px-2 py-0.5 rounded-md transition-colors ${
          locale === "en"
            ? "bg-amber-500 text-white"
            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        }`}
      >
        EN
      </button>
    </div>
  );
}
