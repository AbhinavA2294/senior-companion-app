import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRoleLabel, getDashboardPath } from "@/lib/utils";
import type { UserRole } from "@/types";
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
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };

function getDashboardNavItems(role: UserRole, basePath: string): NavItem[] {
  const common: NavItem[] = [
    { href: basePath, label: "Dashboard", icon: LayoutDashboard },
    { href: `${basePath}/profile`, label: "My Profile", icon: User },
    { href: `${basePath}/notifications`, label: "Notifications", icon: Bell },
  ];

  const roleSpecific: Record<UserRole, NavItem[]> = {
    senior: [
      { href: "/senior/bookings", label: "My Bookings", icon: Calendar },
      { href: "/senior/bookings/new", label: "Book a Companion", icon: Plus },
      { href: "/senior/ratings", label: "My Reviews", icon: Star },
    ],
    family: [
      { href: "/family/bookings", label: "Bookings", icon: Calendar },
      { href: "/family/seniors", label: "My Seniors", icon: Users },
      { href: "/family/bookings/new", label: "Book a Companion", icon: Plus },
    ],
    companion: [
      { href: "/companion/bookings", label: "Booking Requests", icon: Calendar },
      { href: "/companion/schedule", label: "Upcoming Visits", icon: ClipboardList },
      { href: "/companion/availability", label: "Availability", icon: Clock },
      { href: "/companion/earnings", label: "My Earnings", icon: DollarSign },
      { href: "/companion/ratings", label: "My Ratings", icon: Star },
      { href: "/companion/verification", label: "Verification", icon: ShieldCheck },
      { href: "/companion/support", label: "Support", icon: HelpCircle },
    ],
    admin: [
      { href: "/admin/companions", label: "Companions", icon: Users },
      { href: "/admin/bookings", label: "Bookings", icon: Calendar },
      { href: "/admin/reports", label: "Incident Reports", icon: ClipboardList },
      { href: "/admin/activity", label: "Activity", icon: Activity },
    ],
  };

  return [...common, ...(roleSpecific[role] ?? [])];
}

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
  const navItems = getDashboardNavItems(role, basePath);

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
                Hello, {firstName}
              </span>
              <span className="ml-2 text-xs bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full font-medium">
                {getRoleLabel(role)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="relative h-10 w-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
            </button>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="h-10 px-3 flex items-center gap-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
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
