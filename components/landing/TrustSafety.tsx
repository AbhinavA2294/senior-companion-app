import React from "react";
import { Shield, CheckCircle, Eye, PhoneCall } from "lucide-react";

const trustItems = [
  {
    icon: Shield,
    title: "Background-checked companions",
    description:
      "Every companion undergoes a thorough background check, identity verification, and personal interview before joining our platform.",
  },
  {
    icon: CheckCircle,
    title: "Verified profiles",
    description:
      "Companion profiles are reviewed and approved by our team. You see real photos, genuine reviews, and verified experience.",
  },
  {
    icon: Eye,
    title: "Visit check-in system",
    description:
      "Companions check in and out digitally. Family members can be notified when a visit begins and ends, giving you peace of mind.",
  },
  {
    icon: PhoneCall,
    title: "Family summaries",
    description:
      "After each visit, companions can submit a brief, friendly summary for authorized family members — keeping everyone connected.",
  },
];

export function TrustSafety() {
  return (
    <section
      id="safety"
      aria-labelledby="trust-heading"
      className="py-16 sm:py-24 bg-sage-50"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2
            id="trust-heading"
            className="font-display text-senior-3xl sm:text-senior-4xl font-bold text-gray-900 mb-4"
          >
            Your safety is our foundation
          </h2>
          <p className="text-senior-lg text-gray-600 max-w-2xl mx-auto">
            We take the trust families place in us seriously. Every safeguard below is built
            into the platform — not an afterthought.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex gap-5 bg-white rounded-2xl p-7 shadow-sm border border-sage-100"
              >
                <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-sage-100">
                  <Icon className="h-6 w-6 text-sage-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-senior-lg text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-senior-base text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
