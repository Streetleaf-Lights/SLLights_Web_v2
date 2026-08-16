/** First letter of the first two words, uppercased (e.g. "Coastal Power" -> "CP"). */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Formats a percentage to at most 1 decimal place, trimming a trailing ".0" (89.77 -> "89.8%", 100.0 -> "100%"). Returns "—" if the value is missing. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value.toFixed(1))}%`;
}

/** Green at/above 80%, yellow at/above 50%, red below — for Panel/Battery Status percentages. Neutral (no color) if the value is missing. */
export function tieredPercentClass(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  if (value >= 80) return "text-[var(--status-active)]";
  if (value >= 50) return "text-[var(--status-warning)]";
  return "text-[var(--status-flagged)]";
}

/**
 * Strips a trailing timezone offset (or "Z") from a timestamp for a cleaner
 * display: "2026-07-26 13:25:41+00:00" -> "2026-07-26 13:25:41". Returns
 * "—" for null (no telemetry available).
 */
export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/(?:[+-]\d{2}:\d{2}|Z)$/, "").trim();
}

/**
 * True for "Working" or "Daylight" (case-insensitive, whitespace-tolerant —
 * the API's casing isn't guaranteed to match these exact literals). False
 * for null/undefined or anything else.
 */
export function isLightStatusWorking(status: string | null | undefined): boolean {
  if (status === null || status === undefined) return false;
  const normalized = status.trim().toLowerCase();
  return normalized === "working" || normalized === "daylight";
}

/**
 * "Working" or "Daylight" both display as "Working" in green; anything else
 * (e.g. a fault code) displays as-is (original casing preserved) in red. A
 * null/undefined status (no telemetry available for that pole) displays
 * neutrally, not as a fault.
 */
export function formatLightStatus(status: string | null | undefined): { label: string; className: string } {
  if (status === null || status === undefined) {
    return { label: "—", className: "text-[var(--ink-faint)]" };
  }
  const isWorking = isLightStatusWorking(status);
  return {
    label: isWorking ? "Working" : status,
    className: isWorking ? "text-[var(--status-active)]" : "text-[var(--status-flagged)]",
  };
}

/**
 * Green "Online" when true, red "Offline" when false. When isOnline is
 * null, the pole has no current online-status reading — whether that
 * means it's actually disconnected or we just don't know depends on
 * whether it has ever reported in at all: "Disconnected" if lastUpdate is
 * present (it has reported before, just not its online status), "Unknown"
 * if lastUpdate is also null (no telemetry of any kind exists yet).
 */
export function connectionStatus(
  isOnline: boolean | null | undefined,
  lastUpdate: string | null | undefined,
): { text: string; className: string } {
  if (isOnline === null || isOnline === undefined) {
    return lastUpdate === null || lastUpdate === undefined
      ? { text: "Unknown", className: "text-[var(--ink-faint)]" }
      : { text: "Disconnected", className: "text-[var(--status-flagged)]" };
  }
  return {
    text: isOnline ? "Online" : "Offline",
    className: isOnline ? "text-[var(--status-active)]" : "text-[var(--status-flagged)]",
  };
}

/**
 * A "silent" pole is one whose lastUpdate is more than 48 hours old (or
 * missing entirely) — its "48h" stats are stale, describing whatever it
 * last reported rather than its current state, so callers should label
 * them as "Last Known" rather than presenting them as live.
 */
export function isSilentPole(lastUpdate: string | null | undefined): boolean {
  if (!lastUpdate) return true;
  const parsed = new Date(lastUpdate.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return true;
  const hoursSinceUpdate = (Date.now() - parsed.getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate > 48;
}
