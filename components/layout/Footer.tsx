import React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-sage-900 text-white">
      {/* Disclaimer banner */}
      <div className="bg-warm-600 py-4">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-sm sm:text-senior-sm font-medium text-white leading-relaxed">
            <strong>Important:</strong> Senior Companion provides non-medical companionship and
            chaperone services only. Companions do not provide medical care, personal care,
            emergency transportation, or financial services.
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
              Trusted, verified companionship for seniors and their families. Because no one
              should face life&apos;s moments alone.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-bold text-white mb-4 text-senior-base">Services</h3>
            <ul className="space-y-2">
              {[
                { label: "Doctor Appointment Chaperone", href: "/services" },
                { label: "Walks & Park Visits", href: "/services" },
                { label: "Errands & Shopping", href: "/services" },
                { label: "Social Companionship", href: "/services" },
                { label: "All Services", href: "/services" },
              ].map((item) => (
                <li key={item.label}>
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
            <h3 className="font-bold text-white mb-4 text-senior-base">Company</h3>
            <ul className="space-y-2">
              {[
                { label: "About Us", href: "/about" },
                { label: "Become a Companion", href: "/register" },
                { label: "Trust & Safety", href: "/services#safety" },
                { label: "Service Boundaries", href: "/services#boundaries" },
              ].map((item) => (
                <li key={item.label}>
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

          {/* Legal */}
          <div>
            <h3 className="font-bold text-white mb-4 text-senior-base">Legal</h3>
            <ul className="space-y-2">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Contact Support", href: "/contact" },
              ].map((item) => (
                <li key={item.label}>
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
            &copy; {new Date().getFullYear()} Senior Companion. All rights reserved.
          </p>
          <p className="text-sage-500 text-xs text-center sm:text-right max-w-md">
            Not a licensed healthcare provider. Not a medical transportation service. For
            companionship and non-medical chaperone services only.
          </p>
        </div>
      </div>
    </footer>
  );
}
