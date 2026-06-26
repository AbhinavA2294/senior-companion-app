import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerTranslation } from "@/lib/i18n/server";
import { getDashboardPath } from "@/lib/utils";
import type { UserRole } from "@/types";
import { LanguageSelector } from "@/components/i18n/language-selector";
import {
  Heart,
  Bell,
  LogOut,
  LayoutDashboard,
  Calendar,
  User,
  Star,
  Users,
  ClipboardList,
  ShieldCheck,
  Plus,
  Activity,
  Clock,
  HelpCircle,
  DollarSign,
  Settings,
  Rocket,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };

function getDashboardNavItems(
  role: UserRole,
  basePath: string,
  t: (key: string) => string,
): NavItem[] {
  const common: NavItem[] = [
    { href: basePath,                    label: t("nav.dashboard"),     icon: LayoutDashboard },
    { href: `${basePath}/profile`,       label: t("nav.myProfile"),     icon: User },
    { href: `${basePath}/notifications`, label: t("nav.notifications"), icon: Bell },
    { href: "/settings/accessibility",   label: t("nav.accessibility"), icon: Settings },
  ];

  const roleSpecific: Record<UserRole, NavItem[]> = {
    senior: [
      { href: "/senior/bookings",     label: t("nav.myBookings"),    icon: Calendar },
      { href: "/senior/bookings/new", label: t("nav.bookCompanion"), icon: Plus },
      { href: "/senior/ratings",      label: t("nav.myReviews"),     icon: Star },
    ],
    family: [
      { href: "/family/bookings",     label: t("nav.bookings"),      icon: Calendar },
      { href: "/family/seniors",      label: t("nav.mySeniors"),     icon: Users },
      { href: "/family/bookings/new", label: t("nav.bookCompanion"), icon: Plus },
    ],
    companion: [
      { href: "/companion/bookings",      label: t("nav.bookingRequests"), icon: Calendar },
      { href: "/companion/schedule",      label: t("nav.upcomingVisits"),  icon: ClipboardList },
      { href: "/companion/availability",  label: t("nav.availability"),    icon: Clock },
      { href: "/companion/earnings",      label: t("nav.myEarnings"),      icon: DollarSign },
      { href: "/companion/ratings",       label: t("nav.myRatings"),       icon: Star },
      { href: "/companion/verification",  label: t("nav.verification"),    icon: ShieldCheck },
      { href: "/companion/support",       label: t("nav.support"),         icon: HelpCircle },
    ],
    admin: [
      { href: "/admin/companions", label: t("nav.companions"),      icon: Users },
      { href: "/admin/bookings",   label: t("nav.bookings"),        icon: Calendar },
      { href: "/admin/reports",    label: t("nav.incidentReports"), icon: ClipboardList },
      { href: "/admin/activity",   label: t("nav.activity"),        icon: Activity },
      { href: "/admin/pilot",      label: t("nav.pilotOps"),        icon: Rocket },
    ],
  };

  return [...common, ...(roleSpecific[role] ?? [])];
}

const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  senior:    "dashboard.roleSenior",
  family:    "dashboard.roleFamily",
  companion: "dashboard.roleCompanion",
  admin:     "dashboard.roleAdmin",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const role = (profile?.role ?? "senior") as UserRole;
  const firstName = profile?.first_name ?? "there";
  const basePath = getDashboardPath(role);

  const { t } = getServerTranslation();
  const navItems = getDashboardNavItems(role, basePath, t);
  const roleLabel = t(ROLE_LABEL_KEYS[role]);
  const greeting = t("dashboard.hello").replace("{name}", firstName);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gray-50">
      {/* Dashboard top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-20 z-40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100">
              <Heart className="h-5 w-5 text-sage-600" aria-hidden="true" />
            </div>
            <div>
              <span className="font-semibold text-gray-900 text-senior-sm">
                {greeting}
              </span>
              <span className="ml-2 text-xs bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full font-medium">
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector compact />
            <button
              className="relative h-10 w-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 transition-colors"
              aria-label={t("common.notifications")}
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </button>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="h-10 px-3 flex items-center gap-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("common.signOut")}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <nav aria-label="Dashboard navigation" className="lg:w-60 flex-shrink-0">
            <ul className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
              {navItems.map((item) => (
                <li key={item.href} className="flex-shrink-0">
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-senior-sm font-medium text-gray-600 hover:bg-white hover:text-sage-700 hover:shadow-sm border border-transparent hover:border-sage-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 whitespace-nowrap"
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main content */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
