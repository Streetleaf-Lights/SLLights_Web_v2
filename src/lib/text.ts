/** First letter of the first two words, uppercased (e.g. "Coastal Power" -> "CP"). */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Formats a percentage to at most 1 decimal place, trimming a trailing ".0" (89.77 -> "89.8%", 100.0 -> "100%"). */
export function formatPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

/** Green at/above 50%, red below — for coloring a "lights working" percentage. */
export function workingPercentClass(value: number): string {
  return value >= 50 ? "text-[var(--status-active)]" : "text-[var(--status-flagged)]";
}

/** Green at/above 80%, yellow at/above 50%, red below — for Panel/Battery Status percentages. */
export function tieredPercentClass(value: number): string {
  if (value >= 80) return "text-[var(--status-active)]";
  if (value >= 50) return "text-[var(--status-warning)]";
  return "text-[var(--status-flagged)]";
}

/**
 * Strips a trailing timezone offset (or "Z") from a timestamp for a cleaner
 * display: "2026-07-26 13:25:41+00:00" -> "2026-07-26 13:25:41". Returns
 * "—" for null (no telemetry available).
 */
export function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  return value.replace(/(?:[+-]\d{2}:\d{2}|Z)$/, "").trim();
}

/**
 * True for "Working" or "Daylight" (case-insensitive, whitespace-tolerant —
 * the API's casing isn't guaranteed to match these exact literals). False
 * for null or anything else.
 */
export function isLightStatusWorking(status: string | null): boolean {
  if (status === null) return false;
  const normalized = status.trim().toLowerCase();
  return normalized === "working" || normalized === "daylight";
}

/**
 * "Working" or "Daylight" both display as "Working" in green; anything else
 * (e.g. a fault code) displays as-is (original casing preserved) in red. A
 * null status (no telemetry available for that pole) displays neutrally,
 * not as a fault.
 */
export function formatLightStatus(status: string | null): { label: string; className: string } {
  if (status === null) {
    return { label: "—", className: "text-[var(--ink-faint)]" };
  }
  const isWorking = isLightStatusWorking(status);
  return {
    label: isWorking ? "Working" : status,
    className: isWorking ? "text-[var(--status-active)]" : "text-[var(--status-flagged)]",
  };
}
