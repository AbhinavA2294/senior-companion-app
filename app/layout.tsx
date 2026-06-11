import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Senior Companion",
    default: "Senior Companion — Trusted Companionship for Seniors",
  },
  description:
    "Book a verified companion to accompany your loved one to appointments, walks, errands, restaurants, and social activities. Safe, caring, and always non-medical.",
  keywords: [
    "senior companion",
    "companion for seniors",
    "senior chaperone",
    "elderly companion",
    "non-medical companion",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Senior Companion",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4c6e43",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-sage-600 focus:px-4 focus:py-2 focus:text-white focus:text-senior-base focus:font-semibold"
        >
          Skip to main content
        </a>
        <Navbar />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
