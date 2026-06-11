import type { Metadata } from "next";
import { ServiceBoundaries } from "@/components/landing/ServiceBoundaries";
import { TrustSafety } from "@/components/landing/TrustSafety";
import { ActivitiesShowcase } from "@/components/landing/ActivitiesShowcase";

export const metadata: Metadata = {
  title: "Our Services & Boundaries",
  description:
    "Understand exactly what Senior Companion provides — and what we don't. Non-medical companionship services for seniors, clearly defined.",
};

export default function ServicesPage() {
  return (
    <div>
      {/* Page header */}
      <div className="bg-sage-50 py-14 sm:py-20 border-b border-sage-100">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-5">
            Our Services
          </h1>
          <p className="text-senior-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Senior Companion provides non-medical companionship and chaperone services. We believe
            in radical clarity: here is exactly what our companions can and cannot do.
          </p>
        </div>
      </div>

      <ActivitiesShowcase />
      <TrustSafety />
      <ServiceBoundaries />
    </div>
  );
}
