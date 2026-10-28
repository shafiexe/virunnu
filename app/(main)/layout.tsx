import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "../globals.css";
import { NavUser } from "@/components/nav";
import { LanguageToggle } from "@/components/language-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/session";
import { Analytics } from "@vercel/analytics/next";
import { VirunnuLogo } from "@/components/virunnu-logo";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const instant = false;

export const metadata: Metadata = {
  title: "Virunnu — Book the perfect hall",
  description: "Find and book halls for weddings, receptions and celebrations across Kerala.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Virunnu",
  },
};

export const viewport: Viewport = {
  themeColor: "#D97706",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await getSession();
  const showLanguageToggle = !session || session.role === "CUSTOMER";
  const f = (messages as Record<string, Record<string, string>>).footer ?? {};

  return (
    <html lang={locale} className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply saved theme class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}else if(t==='light'){document.documentElement.classList.remove('dark')}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}})();` }} />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manjari:wght@400;700&family=Cormorant+Garamond:ital,wght@1,600&display=swap" />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-sm">
            <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
              <a href="/" className="flex items-center text-zinc-900 dark:text-zinc-50">
                <VirunnuLogo fontSize={24} />
              </a>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <div className="hidden sm:block w-px h-5 mx-2 bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                {showLanguageToggle && <LanguageToggle />}
                <Suspense fallback={<div className="h-8 w-20 rounded-lg bg-zinc-100 animate-pulse" />}>
                  <NavUser />
                </Suspense>
              </div>
            </div>
          </header>
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Suspense>
            <BottomNav />
          </Suspense>
          <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pt-8 pb-6">
            <div className="mx-auto max-w-5xl px-4 space-y-6">
              {/* Top row: brand + social */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div className="space-y-1.5 text-center md:text-left text-zinc-900 dark:text-zinc-50">
                  <VirunnuLogo fontSize={22} />
                  <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mx-auto md:mx-0">
                    Find and book halls for weddings, receptions &amp; celebrations across Kerala.
                  </p>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-1">
                  {[
                    { label: "Instagram", href: "#", hover: "hover:text-[#E1306C] hover:bg-pink-50 dark:hover:bg-pink-950/20",   svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg> },
                    { label: "Facebook",  href: "#", hover: "hover:text-[#1877F2] hover:bg-blue-50 dark:hover:bg-blue-950/20",   svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> },
                    { label: "X",         href: "#", hover: "hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800", svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                    { label: "LinkedIn",  href: "#", hover: "hover:text-[#0A66C2] hover:bg-blue-50 dark:hover:bg-blue-950/20",   svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg> },
                    { label: "YouTube",   href: "#", hover: "hover:text-[#FF0000] hover:bg-red-50 dark:hover:bg-red-950/20",     svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg> },
                  ].map(({ label, href, hover, svg }) => (
                    <a key={label} href={href} aria-label={label} target="_blank" rel="noopener noreferrer"
                      className={`p-2 rounded-xl text-zinc-400 transition-all ${hover}`}>
                      {svg}
                    </a>
                  ))}
                </div>
              </div>
              {/* Divider */}
              <div className="border-t border-zinc-100 dark:border-zinc-800" />
              {/* Bottom row: copyright + legal */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                <span>{f.copyright ?? "© 2025 Virunnu Technologies, Kerala"}</span>
                <div className="flex items-center gap-4">
                  <a href="/terms" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">{f.terms ?? "Terms of Service"}</a>
                  <a href="/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">{f.privacy ?? "Privacy Policy"}</a>
                </div>
              </div>
            </div>
          </footer>
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
