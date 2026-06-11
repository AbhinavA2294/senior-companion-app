import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { UserRole } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    senior: "/senior",
    family: "/family",
    companion: "/companion",
    admin: "/admin",
  };
  return paths[role];
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    senior: "Senior",
    family: "Family Member",
    companion: "Companion",
    admin: "Administrator",
  };
  return labels[role];
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
