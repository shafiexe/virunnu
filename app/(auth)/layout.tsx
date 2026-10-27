import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "../globals.css";

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
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manjari:wght@400;700&display=swap" />
      </head>
      <body className="h-full font-sans">{children}</body>
    </html>
  );
}
