import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service — Senior Companion" };

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 space-y-10">
      <div>
        <div className="inline-block bg-warm-100 text-warm-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          PILOT VERSION — DRAFT
        </div>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm">Last updated: June 2026 &nbsp;|&nbsp; Version 0.1 (Pilot)</p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          This is a draft terms of service for the Senior Companion pilot program. A qualified
          attorney must review and finalise this document before public launch.
        </p>
      </div>

      {[
        {
          title: "1. What Senior Companion provides",
          body: "Senior Companion is a scheduling and matching platform that connects seniors and their families with trained, background-checked companions for non-medical companionship and chaperone services.\n\nSenior Companion is NOT:\n• A healthcare or medical service provider\n• A licensed home care agency\n• A transportation company\n• An emergency response service\n\nCompanions are independent service providers, not employees of Senior Companion.",
        },
        {
          title: "2. Pilot program limitations",
          body: "During the pilot phase, the following restrictions apply:\n\n• Pre-scheduled bookings only — no same-day or emergency requests\n• No overnight bookings\n• No companion driving (no personal vehicle transport)\n• No cash payments — all transactions through the platform only\n• No medical care or personal care (bathing, medication administration, etc.)\n• Service area limited to the Greater Metro Area\n• All companions must be approved by Senior Companion before accepting bookings\n• First-time bookings for each senior are reviewed by our admin team",
        },
        {
          title: "3. Eligibility",
          body: "To use Senior Companion you must be 18 years of age or older. By using the service you represent that you have the legal authority to enter into this agreement on your own behalf or on behalf of the senior for whom you are booking.",
        },
        {
          title: "4. Account responsibilities",
          body: "You are responsible for maintaining the security of your account credentials. You must notify us immediately of any unauthorised access. You agree to provide accurate, current, and complete information and to keep it updated.",
        },
        {
          title: "5. Bookings and cancellations",
          body: "Bookings must be requested at least 12 hours in advance. Cancellations made at least 24 hours before the scheduled start time incur no fee. Late cancellations and no-shows may incur a fee as described in the pricing section.\n\n[PLACEHOLDER: Finalise cancellation fee policy before launch]",
        },
        {
          title: "6. Payments",
          body: "All payments are processed through our platform using the payment provider integrated at the time of booking. Senior Companion does not store payment card numbers. By submitting a booking, you authorise a hold on your payment method for the estimated booking total.\n\nThe hold is converted to a charge upon companion acceptance. Refunds for cancellations are processed according to the cancellation policy above.",
        },
        {
          title: "7. Companion conduct",
          body: "All companions have passed a background check and agreed to our Companion Code of Conduct. Senior Companion cannot guarantee any specific companion will be available for any booking. Companion matching is at our discretion.",
        },
        {
          title: "8. Prohibited uses",
          body: "You may not use Senior Companion to:\n\n• Request medical care, personal care, or emergency services\n• Arrange cash payments or tip companions off-platform\n• Request that a companion drive you in their personal vehicle\n• Submit false or misleading information\n• Harass, threaten, or harm any companion or other user",
        },
        {
          title: "9. Limitation of liability",
          body: "[PLACEHOLDER — requires attorney review]\n\nTo the maximum extent permitted by law, Senior Companion's liability is limited to the amount paid for the specific booking giving rise to the claim. Senior Companion is not liable for companion conduct, which is governed by the Companion Code of Conduct.",
        },
        {
          title: "10. Disputes",
          body: "[PLACEHOLDER — requires attorney review]\n\nDisputes should first be submitted to support@seniorcompanion.example.com. We will attempt to resolve disputes within 14 business days.",
        },
        {
          title: "11. Changes to terms",
          body: "We will notify registered users by email of material changes at least 14 days before they take effect. Continued use after that date constitutes acceptance.",
        },
        {
          title: "12. Contact",
          body: "Questions: support@seniorcompanion.example.com",
        },
      ].map(({ title, body }) => (
        <section key={title}>
          <h2 className="font-semibold text-lg text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{body}</p>
        </section>
      ))}

      <div className="border-t border-gray-100 pt-8 flex gap-6 text-sm">
        <Link href="/privacy" className="text-sage-600 hover:underline">Privacy Policy</Link>
        <Link href="/code-of-conduct" className="text-sage-600 hover:underline">Companion Code of Conduct</Link>
        <Link href="/support" className="text-sage-600 hover:underline">Contact Support</Link>
      </div>
    </div>
  );
}
