"use client";

import React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function Footer() {
  const { t } = useTranslation();

  const serviceLinks = [
    { label: t("footer.doctorChaperone"),    href: "/services" },
    { label: t("footer.walksParks"),         href: "/services" },
    { label: t("footer.errands"),            href: "/services" },
    { label: t("footer.socialCompanionship"),href: "/services" },
    { label: t("footer.allServices"),        href: "/services" },
  ];

  const companyLinks = [
    { label: t("footer.aboutUs"),           href: "/about" },
    { label: t("footer.becomeCompanion"),   href: "/register" },
    { label: t("footer.trustSafety"),       href: "/services#safety" },
    { label: t("footer.serviceBoundaries"), href: "/services#boundaries" },
  ];

  const legalLinks = [
    { label: t("footer.faq"),             href: "/faq" },
    { label: t("footer.contactSupport"),  href: "/support" },
    { label: t("footer.privacyPolicy"),   href: "/privacy" },
    { label: t("footer.termsOfService"),  href: "/terms" },
    { label: t("footer.codeOfConduct"),   href: "/code-of-conduct" },
  ];

  return (
    <footer className="bg-sage-900 text-white">
      {/* Disclaimer banner */}
      <div className="bg-warm-600 py-4">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-sm sm:text-senior-sm font-medium text-white leading-relaxed">
            <strong>{t("footer.important")}</strong> {t("footer.disclaimer")}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-500">
                <Heart className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <span className="font-display text-lg font-bold">Senior Companion</span>
            </div>
            <p className="text-sage-300 text-sm leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-bold text-white mb-4 text-senior-base">{t("footer.servicesHeading")}</h3>
            <ul className="space-y-2">
              {serviceLinks.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className="text-sage-300 hover:text-white text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-400 rounded"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold text-white mb-4 text-senior-base">{t("footer.companyHeading")}</h3>
            <ul className="space-y-2">
              {companyLinks.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className="text-sage-300 hover:text-white text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-400 rounded"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h3 className="font-bold text-white mb-4 text-senior-base">{t("footer.supportLegalHeading")}</h3>
            <ul className="space-y-2">
              {legalLinks.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className="text-sage-300 hover:text-white text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage-400 rounded"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-sage-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sage-400 text-sm">
            {t("footer.copyright").replace("{year}", String(new Date().getFullYear()))}
          </p>
          <p className="text-sage-500 text-xs text-center sm:text-right max-w-md">
            {t("footer.legalNote")}
          </p>
        </div>
      </div>
    </footer>
  );
}
