"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import type { BookingStatus } from "@/types";

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

const STATUS_VARIANTS: Record<
  BookingStatus,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  draft:        "outline",
  requested:    "warning",
  assigned:     "secondary",
  accepted:     "success",
  in_progress:  "default",
  completed:    "success",
  cancelled:    "destructive",
  declined:     "destructive",
  needs_review: "warning",
};

const STATUS_KEYS: Record<BookingStatus, string> = {
  draft:        "bookingStatus.draft",
  requested:    "bookingStatus.requested",
  assigned:     "bookingStatus.assigned",
  accepted:     "bookingStatus.accepted",
  in_progress:  "bookingStatus.inProgress",
  completed:    "bookingStatus.completed",
  cancelled:    "bookingStatus.cancelled",
  declined:     "bookingStatus.declined",
  needs_review: "bookingStatus.needsReview",
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const { t } = useTranslation();
  const variant = STATUS_VARIANTS[status] ?? "outline";
  const label = STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status;
  return <Badge variant={variant}>{label}</Badge>;
}
