import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "../globals.css";
import { NavUser } from "@/components/nav";
import { BottomNav } from "@/components/bottom-nav";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

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
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 font-sans">
        <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-sm">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-amber-500">വിരുന്ന്</span>
              <span className="text-xs font-semibold text-zinc-400 tracking-widest uppercase hidden sm:inline">Virunnu</span>
            </a>
            <Suspense fallback={<div className="h-8 w-20 rounded-lg bg-zinc-100 animate-pulse" />}>
              <NavUser />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Suspense>
          <BottomNav />
        </Suspense>
        <footer className="hidden md:block border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4">
          <div className="mx-auto max-w-5xl px-4 flex items-center justify-between gap-4 text-xs text-zinc-400">
            <span>© 2025 Virunnu Technologies, Kerala</span>
            <div className="flex items-center gap-4">
              <a href="/terms" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Terms of Service</a>
              <a href="/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">Privacy Policy</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
