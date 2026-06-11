import React from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const included = [
  "Doctor appointment chaperone (non-medical support)",
  "Walks, parks, and outdoor activities",
  "Café, restaurant, and dining outings",
  "Grocery shopping and errands",
  "Religious and cultural programs",
  "Social events and gatherings",
  "Friendly conversation and companionship",
  "Reading aloud, card games, board games",
  "Basic technology help (phone, tablet, video calls)",
  "Library and shopping trips",
];

const notIncluded = [
  "Medical care or medical advice",
  "Medication administration or reminders",
  "Personal care (bathing, dressing, toileting)",
  "Emergency medical transportation",
  "Driving in companion's personal vehicle",
  "Overnight or 24-hour care",
  "Financial transactions or banking assistance",
  "Lifting or physical therapy",
];

export function ServiceBoundaries() {
  return (
    <section
      id="boundaries"
      aria-labelledby="boundaries-heading"
      className="py-16 sm:py-24 bg-white"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2
            id="boundaries-heading"
            className="font-display text-senior-3xl sm:text-senior-4xl font-bold text-gray-900 mb-4"
          >
            What we do — and don&apos;t do
          </h2>
          <p className="text-senior-lg text-gray-600 max-w-2xl mx-auto">
            Clarity matters. We&apos;re proud of what we offer, and equally clear about what we
            don&apos;t. Senior Companion is a companionship service — not a home-care or medical
            service.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* What's included */}
          <div className="rounded-2xl border-2 border-sage-200 bg-sage-50 p-8">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="h-7 w-7 text-sage-600 flex-shrink-0" aria-hidden="true" />
              <h3 className="font-bold text-senior-xl text-sage-800">What companions can do</h3>
            </div>
            <ul className="space-y-3" aria-label="Services included">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="h-5 w-5 text-sage-500 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-senior-base text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What's not included */}
          <div className="rounded-2xl border-2 border-red-100 bg-red-50 p-8">
            <div className="flex items-center gap-3 mb-6">
              <XCircle className="h-7 w-7 text-red-500 flex-shrink-0" aria-hidden="true" />
              <h3 className="font-bold text-senior-xl text-red-800">What companions cannot do</h3>
            </div>
            <ul className="space-y-3" aria-label="Services not included">
              {notIncluded.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <XCircle
                    className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-senior-base text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-2xl border-2 border-warm-200 bg-warm-50 p-6 flex gap-4">
          <AlertTriangle
            className="h-6 w-6 text-warm-600 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="font-bold text-warm-900 text-senior-base mb-1">
              Important disclaimer
            </p>
            <p className="text-warm-800 text-senior-base leading-relaxed">
              Senior Companion provides non-medical companionship and chaperone services only.
              Companions do not provide medical care, personal care, emergency transportation, or
              financial services. If you or your loved one requires medical or personal care
              assistance, please contact a licensed home-care agency or healthcare provider.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
