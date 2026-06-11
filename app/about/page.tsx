import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, Target, Users, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Senior Companion — our mission, values, and the team behind trusted non-medical companionship for seniors.",
};

const values = [
  {
    icon: Heart,
    title: "Dignity first",
    description:
      "Every senior deserves to live fully and independently. We build services that honor that — not services that patronize.",
  },
  {
    icon: Shield,
    title: "Safety without compromise",
    description:
      "Background checks, verified identities, digital check-ins, and clear service limits. Trust is earned, and we earn it every visit.",
  },
  {
    icon: Users,
    title: "Family in the loop",
    description:
      "Families carry real worry. Our platform keeps authorized family members informed without being intrusive.",
  },
  {
    icon: Target,
    title: "Clarity of purpose",
    description:
      "We are a companionship service — not home care, not medical transport, not caregiving. Knowing what we are makes us better at it.",
  },
];

export default function AboutPage() {
  return (
    <div className="py-12 sm:py-20">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            About Senior Companion
          </h1>
          <p className="text-senior-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            We started with a simple observation: too many seniors arrive at doctor appointments
            alone, eat lunch alone, and spend their days without anyone to talk to — not because
            their families don&apos;t care, but because life gets busy and distance gets in the way.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-sage-50 rounded-3xl p-8 sm:p-12 mb-16">
          <h2 className="font-display text-senior-3xl font-bold text-gray-900 mb-5">
            Our mission
          </h2>
          <p className="text-senior-lg text-gray-700 leading-relaxed mb-4">
            To make trusted, vetted companionship accessible to every senior — so that no one
            faces an important appointment, errand, or afternoon alone unless they choose to.
          </p>
          <p className="text-senior-base text-gray-600 leading-relaxed">
            Senior Companion is not a healthcare company. We do not provide medical care,
            personal care, or emergency services. We are a companionship marketplace, and we are
            proud of exactly that.
          </p>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h2 className="font-display text-senior-3xl font-bold text-gray-900 mb-8 text-center">
            What we stand for
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="flex gap-5 p-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex-shrink-0 h-11 w-11 flex items-center justify-center rounded-xl bg-sage-100">
                    <Icon className="h-6 w-6 text-sage-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-senior-base text-gray-900 mb-2">{value.title}</h3>
                    <p className="text-gray-600 text-senior-sm leading-relaxed">{value.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Who we serve */}
        <div className="mb-16">
          <h2 className="font-display text-senior-3xl font-bold text-gray-900 mb-6">
            Who we serve
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                title: "Seniors",
                desc: "Adults 60+ who want a trusted companion for outings, errands, appointments, and social activities.",
              },
              {
                title: "Family members",
                desc: "Adult children and caregiving relatives who want to arrange companionship for a loved one — locally or remotely.",
              },
              {
                title: "Companions",
                desc: "Warm, vetted individuals who find meaning in spending time with seniors and supporting their independence.",
              },
            ].map((group) => (
              <div key={group.title} className="rounded-2xl bg-sage-50 border border-sage-100 p-6">
                <h3 className="font-bold text-senior-lg text-sage-800 mb-3">{group.title}</h3>
                <p className="text-gray-600 text-senior-sm leading-relaxed">{group.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-sage-600 to-sage-700 rounded-3xl p-10 text-white">
          <h2 className="font-display text-senior-3xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-sage-100 text-senior-lg mb-8 max-w-lg mx-auto">
            Whether you&apos;re booking for yourself, a parent, or joining as a companion — welcome.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="warm" asChild>
              <Link href="/register?role=senior">Book a Companion</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white text-white hover:bg-white hover:text-sage-700"
            >
              <Link href="/register?role=companion">Become a Companion</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
