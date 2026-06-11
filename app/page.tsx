import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ActivitiesShowcase } from "@/components/landing/ActivitiesShowcase";
import { TrustSafety } from "@/components/landing/TrustSafety";
import { ServiceBoundaries } from "@/components/landing/ServiceBoundaries";

export const metadata: Metadata = {
  title: "Trusted Companionship for Seniors | Senior Companion",
  description:
    "Book a verified, background-checked companion to accompany your loved one to appointments, walks, errands, and social events. Non-medical companionship you can trust.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <ActivitiesShowcase />
      <TrustSafety />
      <ServiceBoundaries />
    </>
  );
}
