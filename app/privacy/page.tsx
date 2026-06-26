import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy — Senior Companion" };

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 space-y-10">
      <div>
        <div className="inline-block bg-warm-100 text-warm-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          PILOT VERSION — DRAFT
        </div>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm">Last updated: June 2026 &nbsp;|&nbsp; Version 0.1 (Pilot)</p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          This is a draft privacy policy for the Senior Companion pilot program. Before the public
          launch, a qualified attorney must review and finalise this document.
        </p>
      </div>

      {[
        {
          title: "1. Who we are",
          body: 'Senior Companion provides non-medical companionship and chaperone services connecting seniors with verified companions. References to "we," "us," or "our" mean Senior Companion.',
        },
        {
          title: "2. What information we collect",
          body: "We collect the minimum information necessary to provide the service:\n\n• Name, email address, and phone number for account holders\n• Emergency contact names and phone numbers (seniors only)\n• Booking details: date, time, location, activity type, and special notes\n• GPS coordinates at check-in and check-out only — we do not continuously track location\n• Companion background check status (pass/fail) and verification document references\n• Feedback and ratings submitted after completed visits\n• Consent timestamps and IP addresses for legal compliance\n\nWe do NOT collect: Social Security numbers, medical records, diagnoses, prescriptions, insurance information, or payment card numbers (payments are processed by our payment provider under their own privacy terms).",
        },
        {
          title: "3. How we use your information",
          body: "We use collected information to:\n\n• Match seniors with available, verified companions\n• Manage booking scheduling and notifications\n• Conduct background checks on companions\n• Ensure safety through check-in and check-out confirmation\n• Provide customer support\n• Improve the service through aggregated, anonymised analytics\n• Meet legal and regulatory obligations",
        },
        {
          title: "4. Who we share information with",
          body: "We share the minimum necessary information:\n\n• Companions receive the senior's first name and general location when assigned to a booking — never full address until day-of confirmation\n• Family members authorised by the senior may view booking details\n• Our technology providers (Supabase, Vercel) who operate under data processing agreements\n• Background check providers for companion verification\n• Law enforcement when required by law\n\nWe do NOT sell personal information.",
        },
        {
          title: "5. Data retention",
          body: "• Booking records: 7 years (financial/legal obligations)\n• Check-in GPS coordinates: anonymised after 90 days\n• Profile data: deleted on account closure (see Right to Erasure below)\n• Incident reports: retained indefinitely for safety records\n• Consent records: retained permanently as a legal audit trail",
        },
        {
          title: "6. Your rights",
          body: "You have the right to:\n\n• Access the personal information we hold about you\n• Correct inaccurate information\n• Request deletion of your account and personal data (Right to Erasure)\n• Withdraw consent for optional data processing\n• Receive a copy of your data in a portable format\n\nTo exercise these rights, contact us at the address below. We will respond within 30 days.",
        },
        {
          title: "7. Security",
          body: "We implement technical safeguards including encrypted data in transit (TLS), encrypted data at rest, row-level access controls, and regular security reviews. No system is 100% secure; we will notify affected users of any breach as required by law.",
        },
        {
          title: "8. Children",
          body: "Our services are intended for adults aged 18 and over. We do not knowingly collect information from minors.",
        },
        {
          title: "9. Changes to this policy",
          body: "We will notify registered users by email of material changes to this policy at least 14 days before the change takes effect.",
        },
        {
          title: "10. Contact",
          body: "Privacy questions or requests: support@seniorcompanion.example.com\n\n[PLACEHOLDER: Add physical mailing address before public launch]",
        },
      ].map(({ title, body }) => (
        <section key={title}>
          <h2 className="font-semibold text-lg text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{body}</p>
        </section>
      ))}

      <div className="border-t border-gray-100 pt-8 flex gap-6 text-sm">
        <Link href="/terms" className="text-sage-600 hover:underline">Terms of Service</Link>
        <Link href="/support" className="text-sage-600 hover:underline">Contact Support</Link>
      </div>
    </div>
  );
}
