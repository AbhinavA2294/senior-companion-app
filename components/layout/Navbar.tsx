"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  const publicNavItems = [
    { label: t("navbar.home"),     href: "/" },
    { label: t("navbar.about"),    href: "/about" },
    { label: t("navbar.services"), href: "/services" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-sage-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded-lg"
          aria-label={t("navbar.logoAlt")}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-500">
            <Heart className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span className="font-display text-xl font-bold text-sage-800 hidden sm:block">
            Senior Companion
          </span>
          <span className="font-display text-xl font-bold text-sage-800 sm:hidden">SC</span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-senior-base font-medium text-gray-700 hover:text-sage-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 rounded px-1 py-0.5"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSelector compact />
          <Button variant="ghost" size="default" asChild>
            <Link href="/login">{t("navbar.signIn")}</Link>
          </Button>
          <Button variant="default" size="default" asChild>
            <Link href="/register">{t("navbar.getStarted")}</Link>
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden flex items-center justify-center h-12 w-12 rounded-lg border-2 border-sage-200 text-sage-700 hover:bg-sage-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? t("navbar.closeMenu") : t("navbar.openMenu")}
        >
          {mobileOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={cn(
          "md:hidden border-t border-sage-100 bg-white transition-all duration-200",
          mobileOpen ? "block" : "hidden"
        )}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="container mx-auto max-w-7xl px-4 py-4 flex flex-col gap-2">
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-4 py-3 text-senior-lg font-medium text-gray-700 hover:bg-sage-50 hover:text-sage-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-sage-100">
            <LanguageSelector />
            <Button variant="outline" size="lg" asChild className="w-full">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                {t("navbar.signIn")}
              </Link>
            </Button>
            <Button size="lg" asChild className="w-full">
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                {t("navbar.getStarted")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
