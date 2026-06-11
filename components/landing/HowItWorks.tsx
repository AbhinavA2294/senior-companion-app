import React from "react";
import { UserPlus, Search, CalendarCheck, Heart } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create your account",
    description:
      "Sign up as a senior, family member, or companion in minutes. Family members can manage bookings for loved ones.",
  },
  {
    icon: Search,
    title: "Find the right companion",
    description:
      "Browse verified companions in your area. Read profiles, check reviews, and find someone who shares your interests.",
  },
  {
    icon: CalendarCheck,
    title: "Book with confidence",
    description:
      "Choose a date, time, and activity. Confirm the booking and receive a reminder. Your safety is our priority.",
  },
  {
    icon: Heart,
    title: "Enjoy meaningful time",
    description:
      "Your companion meets you where you are. After the visit, receive a friendly summary of the time spent together.",
  },
];

export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="py-16 sm:py-24 bg-white"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2
            id="how-it-works-heading"
            className="font-display text-senior-3xl sm:text-senior-4xl font-bold text-gray-900 mb-4"
          >
            How it works
          </h2>
          <p className="text-senior-lg text-gray-600 max-w-xl mx-auto">
            Getting started is simple. We&apos;ve designed every step with seniors and families in
            mind.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative">
                {/* Connector line (desktop only) */}
                {index < steps.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] right-0 h-0.5 bg-sage-200"
                    aria-hidden="true"
                  />
                )}

                <div className="flex flex-col items-center text-center">
                  {/* Step number + icon */}
                  <div className="relative mb-5">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-100 ring-4 ring-white shadow-sm">
                      <Icon className="h-8 w-8 text-sage-600" aria-hidden="true" />
                    </div>
                    <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-sage-600 text-white text-xs font-bold">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="font-bold text-senior-lg text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-senior-base text-gray-600 leading-relaxed">
                    {step.description}
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
