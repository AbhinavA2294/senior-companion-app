import React from "react";
import {
  Stethoscope,
  TreePine,
  Coffee,
  ShoppingCart,
  BookOpen,
  Users,
  Gamepad2,
  Smartphone,
} from "lucide-react";

const activities = [
  {
    icon: Stethoscope,
    title: "Doctor appointments",
    description: "A calm, familiar face at medical visits. Companionship, not medical care.",
  },
  {
    icon: TreePine,
    title: "Walks & parks",
    description: "Fresh air, gentle movement, and pleasant conversation at your pace.",
  },
  {
    icon: Coffee,
    title: "Cafés & restaurants",
    description: "Enjoy a meal or coffee with good company. Reservations welcome.",
  },
  {
    icon: ShoppingCart,
    title: "Errands & shopping",
    description: "Grocery runs, pharmacy trips, and library visits made easier together.",
  },
  {
    icon: BookOpen,
    title: "Reading & conversation",
    description: "Shared stories, lively discussion, or a quiet afternoon with a book.",
  },
  {
    icon: Users,
    title: "Social events",
    description: "Community gatherings, temple programs, and cultural events — together.",
  },
  {
    icon: Gamepad2,
    title: "Games & activities",
    description: "Cards, chess, board games, or puzzles. Fun and friendly competition.",
  },
  {
    icon: Smartphone,
    title: "Technology help",
    description: "Video calls with family, phone setup, and tablet basics — no pressure.",
  },
];

export function ActivitiesShowcase() {
  return (
    <section aria-labelledby="activities-heading" className="py-16 sm:py-24 bg-white">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2
            id="activities-heading"
            className="font-display text-senior-3xl sm:text-senior-4xl font-bold text-gray-900 mb-4"
          >
            Activities we support
          </h2>
          <p className="text-senior-lg text-gray-600 max-w-xl mx-auto">
            Whatever brings joy, connection, or peace of mind — we&apos;re there for it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div
                key={activity.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-sage-200 transition-all duration-200"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage-100 group-hover:bg-sage-200 transition-colors mb-4">
                  <Icon className="h-6 w-6 text-sage-600" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-senior-base text-gray-900 mb-2">{activity.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{activity.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
