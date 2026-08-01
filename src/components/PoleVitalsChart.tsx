"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PeriodType, PoleVitalPeriod } from "@/lib/types";

const PERIOD_OPTIONS: { type: PeriodType; label: string; limit: number }[] = [
  { type: "Hour", label: "Hourly", limit: 48 },
  { type: "Day", label: "Daily", limit: 30 },
];

/** "2026-07-30 11:00:00-04:00" -> "11:00 AM" (Hour) or "Jul 30" (Day). */
function formatPeriodLabel(periodStart: string | null | undefined, periodType: PeriodType): string {
  if (!periodStart) return "—";
  const date = new Date(periodStart.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return periodStart;
  return periodType === "Hour"
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ChartMessage({ tone, children }: { tone: "muted" | "error"; children: React.ReactNode }) {
  return (
    <div
      className={`flex h-64 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-4 text-center text-[12.5px] ${
        tone === "error" ? "text-[var(--status-flagged)]" : "text-[var(--ink-faint)]"
      }`}
    >
      {children}
    </div>
  );
}

export function PoleVitalsChart({ poleId }: { poleId: string }) {
  const [periodType, setPeriodType] = useState<PeriodType>("Hour");
  const [vitals, setVitals] = useState<PoleVitalPeriod[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const option = PERIOD_OPTIONS.find((o) => o.type === periodType);
    if (!option) return;

    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return undefined;
        setLoading(true);
        setError(null);
        return fetch(
          `/api/getpolevitalsbyperiod?poleId=${encodeURIComponent(poleId)}&periodType=${periodType}&limit=${option.limit}`,
        );
      })
      .then(async (res) => {
        if (cancelled || !res) return;
        const body = await res.json().catch(() => null);
        if (cancelled) return;

        if (!res.ok) {
          setError(body?.error ?? "Failed to load pole vitals.");
          setVitals(null);
          return;
        }
        setVitals(body?.vitals ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Something went wrong. Please try again.");
          setVitals(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [poleId, periodType]);

  // Sort chronologically regardless of the order the API returns them in,
  // so the chart always reads left-to-right oldest-to-newest. A missing
  // periodStart (seen elsewhere in this API as an omitted-rather-than-null
  // field) sorts as if it were the epoch rather than crashing.
  const chartData = (vitals ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(a.periodStart ?? 0).getTime() - new Date(b.periodStart ?? 0).getTime(),
    )
    .map((vital) => ({
      label: formatPeriodLabel(vital.periodStart, periodType),
      battery: vital.avgBatteryPercentage,
      panel: vital.avgPanelPercentage,
      light: vital.avgLightPercentage,
    }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-1.5">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => setPeriodType(option.type)}
            aria-pressed={periodType === option.type}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              periodType === option.type
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <ChartMessage tone="muted">Loading…</ChartMessage>
      ) : error ? (
        <ChartMessage tone="error">{error}</ChartMessage>
      ) : chartData.length === 0 ? (
        <ChartMessage tone="muted">No vitals history available for this pole.</ChartMessage>
      ) : (
        <div className="h-64 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--ink-faint)" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--ink-faint)" width={36} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="battery"
                name="Battery %"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="panel"
                name="Panel %"
                stroke="var(--status-warning)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="light"
                name="Light %"
                stroke="var(--status-active)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
