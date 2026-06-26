"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/lib/actions/bookings";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface CancelBookingButtonProps {
  bookingId: string;
  redirectPath: string;
}

export function CancelBookingButton({ bookingId, redirectPath }: CancelBookingButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelBooking(bookingId);
      if (result.success) {
        router.push(redirectPath);
        router.refresh();
      } else {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-sm text-gray-600">{t("cancelBooking.confirm")}</p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            {t("cancelBooking.keep")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? t("cancelBooking.cancelling") : t("cancelBooking.yes")}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive border-destructive hover:bg-destructive hover:text-white"
      onClick={() => setConfirming(true)}
    >
      <X className="mr-1.5 h-4 w-4" aria-hidden="true" />
      {t("cancelBooking.button")}
    </Button>
  );
}
