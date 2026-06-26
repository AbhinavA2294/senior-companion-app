"use client";

import React, { useState, useTransition } from "react";
import { savePilotSettings } from "@/lib/actions/pilot-settings";

type SettingRow = {
  key: string;
  value: string;
  label: string;
  description: string | null;
  value_type: string;
  updated_at: string;
};

export function PilotSettingsForm({ rows }: { rows: SettingRow[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.key, r.value]))
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setStatus("idle");
  }

  function handleSave() {
    setStatus("saving");
    startTransition(async () => {
      const entries = Object.entries(values).map(([key, value]) => ({ key, value }));
      const result = await savePilotSettings(entries);
      if (result.success) {
        setStatus("saved");
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start border-b border-gray-100 pb-5">
          <div className="md:col-span-1">
            <label htmlFor={row.key} className="block text-sm font-semibold text-gray-900">
              {row.label}
            </label>
            {row.description && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{row.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1 font-mono">{row.key}</p>
          </div>
          <div className="md:col-span-2">
            {row.value_type === "boolean" ? (
              <select
                id={row.key}
                value={values[row.key]}
                onChange={(e) => handleChange(row.key, e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="true">Enabled (true)</option>
                <option value="false">Disabled (false)</option>
              </select>
            ) : row.value_type === "time" ? (
              <input
                id={row.key}
                type="time"
                value={values[row.key]}
                onChange={(e) => handleChange(row.key, e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            ) : row.value_type === "number" ? (
              <input
                id={row.key}
                type="number"
                value={values[row.key]}
                min={0}
                onChange={(e) => handleChange(row.key, e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            ) : (
              <input
                id={row.key}
                type="text"
                value={values[row.key]}
                onChange={(e) => handleChange(row.key, e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              />
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={isPending || status === "saving"}
          className="px-6 py-2 bg-sage-600 text-white rounded-lg text-sm font-semibold hover:bg-sage-700 disabled:opacity-50 transition-colors"
        >
          {isPending || status === "saving" ? "Saving…" : "Save Settings"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-green-600 font-medium">Settings saved.</span>
        )}
        {status === "error" && (
          <span className="text-sm text-red-600 font-medium">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}
