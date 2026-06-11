import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types";

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }
> = {
  draft:        { label: "Draft",       variant: "outline" },
  requested:    { label: "Requested",   variant: "warning" },
  assigned:     { label: "Assigned",    variant: "secondary" },
  accepted:     { label: "Accepted",    variant: "success" },
  in_progress:  { label: "In Progress", variant: "default" },
  completed:    { label: "Completed",   variant: "success" },
  cancelled:    { label: "Cancelled",   variant: "destructive" },
  declined:     { label: "Declined",    variant: "destructive" },
  needs_review: { label: "Needs Review",variant: "warning" },
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
