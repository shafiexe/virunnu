import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "../globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sign in — Virunnu",
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full font-sans">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
