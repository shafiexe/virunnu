import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "../globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// Shared invoice and statement links: plain white page, not indexed.
export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} antialiased`}>
      <body className="bg-zinc-100 font-sans min-h-screen">{children}</body>
    </html>
  );
}
