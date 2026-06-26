import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Companion Code of Conduct — Senior Companion" };

export default function CodeOfConductPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 space-y-10">
      <div>
        <div className="inline-block bg-warm-100 text-warm-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
          PILOT VERSION — DRAFT
        </div>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">
          Companion Code of Conduct
        </h1>
        <p className="text-gray-500 text-sm">Version 0.1 (Pilot)</p>
        <p className="mt-4 text-gray-600 leading-relaxed">
          All companions approved to provide services through Senior Companion must agree to and
          uphold this Code of Conduct. Violations may result in suspension or permanent removal
          from the platform.
        </p>
      </div>

      {[
        {
          title: "Professional conduct",
          items: [
            "Arrive on time for every scheduled booking (within 5 minutes of the scheduled start).",
            "Wear your Senior Companion identification badge during every visit.",
            "Dress appropriately — neat, professional attire.",
            "Communicate promptly: if you will be delayed, contact the senior and the platform immediately.",
            "Maintain a respectful, patient, and courteous manner at all times.",
          ],
        },
        {
          title: "Service boundaries (CRITICAL)",
          items: [
            "Do NOT provide medical care, administer medications, assist with injections, or give medical advice.",
            "Do NOT provide personal care such as bathing, dressing, or toileting.",
            "Do NOT drive the senior in your personal vehicle — use walk, public transit, or rideshare only.",
            "Do NOT accept cash, gifts, or tips from seniors or families (all compensation is through the platform).",
            "Do NOT handle the senior's finances, access their bank accounts, or manage their documents.",
            "Do NOT stay overnight, even if asked by the senior or family.",
            "Do NOT accept emergency requests — if a medical emergency occurs, call 911 immediately and notify the platform.",
          ],
        },
        {
          title: "Safety and check-in",
          items: [
            "Use the Senior Companion app to check in at the start of every visit and check out at the end.",
            "Do not leave the senior alone until their family member, caregiver, or emergency contact has been notified, if needed.",
            "In any medical emergency: call 911 first, then contact the platform at the support number.",
            "Report any safety concerns, accidents, or incidents within 24 hours through the incident report form in the app.",
          ],
        },
        {
          title: "Privacy and confidentiality",
          items: [
            "Do not share any personal information about seniors or families with third parties.",
            "Do not photograph or record seniors without their explicit consent.",
            "Do not discuss the senior's health, finances, or personal matters with anyone outside Senior Companion's support team.",
            "Do not access the senior's home beyond the agreed meeting location.",
          ],
        },
        {
          title: "Digital conduct",
          items: [
            "Do not contact seniors or families through personal phone numbers, social media, or any channel outside the platform.",
            "Do not solicit bookings or payments outside the platform.",
            "Do not share your login credentials with anyone.",
          ],
        },
        {
          title: "Background check and verification",
          items: [
            "Maintain the accuracy of your profile, including availability, languages spoken, and any changes to your background.",
            "Notify Senior Companion immediately of any criminal charges or convictions.",
            "Renewal background checks are required annually.",
          ],
        },
        {
          title: "Violations and reporting",
          items: [
            "Violations of this code should be reported to support@seniorcompanion.example.com.",
            "Retaliation against a senior or family member who makes a report is grounds for immediate removal.",
            "Senior Companion reserves the right to suspend a companion account while investigating a reported incident.",
          ],
        },
      ].map(({ title, items }) => (
        <section key={title}>
          <h2 className="font-semibold text-lg text-gray-900 mb-3">{title}</h2>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sage-400 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 leading-relaxed">
        <strong>Remember:</strong> Senior Companion provides companionship only. If a senior
        needs medical care at any time, call 911 immediately. Do not delay emergency services
        to contact the platform first.
      </div>

      <div className="border-t border-gray-100 pt-8 flex gap-6 text-sm">
        <Link href="/terms" className="text-sage-600 hover:underline">Terms of Service</Link>
        <Link href="/support" className="text-sage-600 hover:underline">Contact Support</Link>
      </div>
    </div>
  );
}
