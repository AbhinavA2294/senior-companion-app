import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MessageSquare, Clock, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Contact Support — Senior Companion" };

export default function SupportPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16 space-y-12">
      <div>
        <h1 className="font-display text-4xl font-bold text-gray-900 mb-3">Contact Support</h1>
        <p className="text-gray-600 text-senior-base leading-relaxed">
          Our team is available to help you during service hours. For non-urgent questions, email
          is the best way to reach us.
        </p>
      </div>

      {/* Emergency banner */}
      <div className="bg-red-50 border border-red-300 rounded-xl p-5 flex gap-3">
        <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-red-800 mb-1">Medical emergencies: call 911</p>
          <p className="text-sm text-red-700">
            Senior Companion does not provide emergency medical services. In any medical
            emergency, call 911 immediately before contacting our team.
          </p>
        </div>
      </div>

      {/* Contact options */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100">
            <Phone className="h-5 w-5 text-sage-600" />
          </div>
          <h2 className="font-bold text-gray-900">Phone support</h2>
          <p className="text-2xl font-display font-bold text-sage-700">1-800-555-CARE</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            Monday – Sunday, 8:00 AM – 8:00 PM
          </div>
          <p className="text-xs text-gray-400">
            Phone support is visible in the app during all active bookings.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-100">
            <Mail className="h-5 w-5 text-sage-600" />
          </div>
          <h2 className="font-bold text-gray-900">Email support</h2>
          <p className="text-senior-base font-mono text-sage-700 break-all">
            support@seniorcompanion.example.com
          </p>
          <p className="text-sm text-gray-500">We aim to respond within one business day.</p>
        </div>
      </div>

      {/* Contact form */}
      <div className="rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-sage-500" />
          <h2 className="font-bold text-gray-900">Send a message</h2>
        </div>
        <p className="text-sm text-gray-500">
          [PLACEHOLDER: A contact form connected to the support email will be available here
          before the pilot begins. For now, please email us directly.]
        </p>
        <div className="space-y-4 opacity-50 pointer-events-none" aria-hidden>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              disabled
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              disabled
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              disabled
              rows={4}
              placeholder="Describe your issue or question…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 resize-none"
            />
          </div>
          <button
            disabled
            className="w-full py-2 bg-sage-600 text-white rounded-lg text-sm font-medium opacity-50"
          >
            Send Message
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="border-t border-gray-100 pt-8 space-y-2">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Helpful resources
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/faq" className="text-sage-600 hover:underline">FAQ</Link>
          <Link href="/terms" className="text-sage-600 hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="text-sage-600 hover:underline">Privacy Policy</Link>
          <Link href="/code-of-conduct" className="text-sage-600 hover:underline">Companion Code of Conduct</Link>
        </div>
      </div>
    </div>
  );
}
