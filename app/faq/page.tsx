import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "FAQ — Senior Companion" };

const faqs = [
  {
    category: "About the service",
    questions: [
      {
        q: "What is Senior Companion?",
        a: "Senior Companion connects seniors and their families with trained, background-checked companions for non-medical companionship and chaperone services. Examples include accompanying a senior to a doctor's appointment, a walk in the park, errands, or social visits.",
      },
      {
        q: "What does a companion do?",
        a: "A companion provides friendly company, assists with navigation (on foot, by public transit, or by rideshare), and ensures the senior is safe and comfortable during the visit. They are not medical professionals and do not provide healthcare, personal care, or financial assistance.",
      },
      {
        q: "What does a companion NOT do?",
        a: "Companions do not: administer medications or provide medical advice; assist with bathing, dressing, or toileting; drive the senior in their personal vehicle; handle money or finances; provide overnight care; or respond to medical emergencies (they will call 911 and notify the platform).",
      },
      {
        q: "Is this a medical service?",
        a: "No. Senior Companion is a companionship and chaperone service only. It is not a healthcare provider, licensed home care agency, or emergency service. Always call 911 for medical emergencies.",
      },
    ],
  },
  {
    category: "Bookings",
    questions: [
      {
        q: "How far in advance do I need to book?",
        a: "Bookings must be made at least 12 hours before the scheduled start time. We are a pre-scheduled service — we do not accept same-day emergency requests.",
      },
      {
        q: "How long can a booking be?",
        a: "Bookings are between 2 and 6 hours. All bookings must start and end on the same calendar day (no overnight visits). Service hours are 8:00 AM – 8:00 PM.",
      },
      {
        q: "Can a family member book on behalf of a senior?",
        a: "Yes. Family members can create an account, link to their senior's profile (with the senior's approval), and book on their behalf. The family member and senior both receive notifications.",
      },
      {
        q: "Can I cancel a booking?",
        a: "Yes, bookings can be cancelled up to 24 hours before the start time with no fee. Later cancellations or no-shows may incur a fee. Contact support if you need to cancel an upcoming booking.",
      },
      {
        q: "How are companions matched to bookings?",
        a: "Our system suggests compatible companions based on availability, location, language, and activity type. All matches are reviewed by our admin team before a companion is assigned. You can see your assigned companion's name and rating in the app before the visit.",
      },
    ],
  },
  {
    category: "Safety",
    questions: [
      {
        q: "How are companions vetted?",
        a: "All companions complete an application, pass a background check (criminal history and identity verification), and must be manually approved by our admin team before they can accept any bookings. We do not approve companions with disqualifying criminal histories.",
      },
      {
        q: "How do I know the companion arrived?",
        a: "Companions check in via the app at the start of every visit. You will receive a notification when check-in is confirmed. If a companion is late or does not check in, you can contact our support team at the phone number shown in the booking.",
      },
      {
        q: "What happens in an emergency?",
        a: "If a medical emergency occurs during a visit, the companion is instructed to call 911 immediately and then notify our support team. Do not rely on Senior Companion for emergency medical response — always call 911.",
      },
      {
        q: "Can I see the companion's identification?",
        a: "Yes. Companions are required to wear their Senior Companion identification badge during every visit. If a companion arrives without identification, you can refuse the visit and contact support.",
      },
    ],
  },
  {
    category: "Payments",
    questions: [
      {
        q: "How do payments work?",
        a: "All payments are processed securely through the platform at the time of booking. We do not accept cash, and companions are not permitted to accept tips or cash payments. Your payment method is charged only after a companion accepts the booking.",
      },
      {
        q: "What is the pricing?",
        a: "Pricing varies by activity type and duration. You will see the estimated total before confirming any booking. Contact support for current pilot pricing details.",
      },
      {
        q: "What if I need a refund?",
        a: "Refunds for eligible cancellations are processed within 5–10 business days. If you believe you were charged in error, contact support@seniorcompanion.example.com.",
      },
    ],
  },
  {
    category: "Pilot program",
    questions: [
      {
        q: "What is the pilot program?",
        a: "Senior Companion is currently in a small community pilot. This means the service is available to a limited number of seniors and families in the Greater Metro Area. All bookings during the pilot are reviewed by our admin team, and we are actively gathering feedback to improve the service.",
      },
      {
        q: "How do I give feedback?",
        a: "After each completed visit, you will be invited to fill out a short feedback form in the app. You can also contact us at support@seniorcompanion.example.com at any time.",
      },
      {
        q: "What languages are supported?",
        a: "The platform supports English, Spanish, Hindi, and Tamil. Select your preferred language from the Accessibility settings in your account.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 space-y-12">
      <div>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-3">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-600 leading-relaxed">
          Can&apos;t find your answer? Contact us at{" "}
          <Link href="/support" className="text-sage-600 hover:underline">
            support
          </Link>{" "}
          or call <strong>1-800-555-CARE</strong>.
        </p>
      </div>

      {faqs.map(({ category, questions }) => (
        <section key={category} className="space-y-5">
          <h2 className="font-display text-xl font-bold text-gray-800 border-b border-gray-100 pb-2">
            {category}
          </h2>
          <div className="space-y-5">
            {questions.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-gray-900 mb-1 text-senior-base">{q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{a}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="bg-sage-50 rounded-xl p-6 text-center space-y-2">
        <p className="font-semibold text-gray-800">Still have questions?</p>
        <Link
          href="/support"
          className="inline-block px-6 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium hover:bg-sage-700 transition-colors"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
