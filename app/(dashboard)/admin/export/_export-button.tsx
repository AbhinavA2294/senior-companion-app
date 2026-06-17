"use client";

import { useState, useTransition } from "react";
import { exportPilotMetricsCSV } from "@/lib/actions/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await exportPilotMetricsCSV();
      if (!result.success || !result.csv) {
        setError((!result.success && result.error) ? result.error : "Export failed.");
        return;
      }
      // Trigger browser download
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `senior-companion-metrics-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleExport} disabled={isPending} className="flex items-center gap-2">
        <Download className="h-4 w-4" />
        {isPending ? "Exporting..." : "Download CSV"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
