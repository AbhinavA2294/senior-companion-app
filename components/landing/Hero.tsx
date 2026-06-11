import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const stats = [
  { value: "500+", label: "Verified Companions" },
  { value: "4.9★", label: "Average Rating" },
  { value: "10,000+", label: "Visits Completed" },
];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-gradient-to-br from-sage-50 via-white to-warm-50 py-16 sm:py-24"
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 rounded-full bg-sage-100 opacity-40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-80 h-80 rounded-full bg-warm-100 opacity-40 blur-3xl"
        aria-hidden="true"
      />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-sage-100 border border-sage-200 px-4 py-2 mb-8">
            <Shield className="h-4 w-4 text-sage-600" aria-hidden="true" />
            <span className="text-sage-700 text-sm font-semibold">
              Background-Checked Companions
            </span>
          </div>

          {/* Headline */}
          <h1
            id="hero-heading"
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
          >
            Trusted companionship{" "}
            <span className="text-sage-600">for the moments</span> that matter.
          </h1>

          {/* Subheadline */}
          <p className="text-senior-lg text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto">
            Book a verified companion to accompany your loved one to appointments, walks, errands,
            restaurants, and social activities. Safe, caring, and always non-medical.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Button size="xl" asChild className="bg-sage-600 hover:bg-sage-700 text-white">
              <Link href="/register?role=senior">Book a Companion</Link>
            </Button>
            <Button size="xl" variant="outline" asChild className="border-sage-600 text-sage-700 hover:bg-sage-50">
              <Link href="/register?role=companion">Become a Companion</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-2xl sm:text-3xl font-bold text-sage-700">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
