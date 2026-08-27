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

/**
 * Minimal shape needed by the pole status/column-text helpers below — a
 * structural subset present on both PoleVital (pole detail / project pole
 * list) and PoleSummary (top-level pole list), so these work for either
 * without importing/coupling to one specific type.
 */
interface PoleStatusFields {
  isOnline: boolean | null;
  lastUpdate: string | null;
  isPoleFault: boolean | null;
  lightStatusLabel: string | null;
  panelStatusLabel: string | null;
  panelIdleReason: string | null;
  batteryStatusLabel: string | null;
}

/** Same OK/Fault mapping and coloring used across the pole detail page and both pole list tables. */
export function poleStatusLabel(isFault: boolean | null | undefined): {
  text: string;
  className: string;
} {
  if (isFault === null || isFault === undefined) {
    return { text: "—", className: "text-[var(--ink-faint)]" };
  }
  return {
    text: isFault ? "Fault" : "OK",
    className: isFault ? "text-[var(--status-flagged)]" : "text-[var(--status-active)]",
  };
}

/**
 * "Overall Status" for a pole-list row: a disconnected pole's isPoleFault
 * reading is stale — show it as unknown (a dash) rather than a fault
 * status that may no longer reflect reality.
 */
export function poleOverallStatus(
  pole: Pick<PoleStatusFields, "isOnline" | "lastUpdate" | "isPoleFault">,
): { text: string; className: string } {
  const connected = connectionStatus(pole.isOnline, pole.lastUpdate);
  return connected.text === "Disconnected"
    ? poleStatusLabel(null)
    : poleStatusLabel(pole.isPoleFault);
}

/**
 * "Not Reporting" if this pole has never had any update at all (no
 * lastUpdate on record), or — for a customer-scoped viewer — any time it's
 * silent at all (the "48H" distinction is a Streetleaf-only detail).
 * "Not Reporting 48H" otherwise, once it's reported before but hasn't
 * checked in for 48h+ — either way, its last-known light label would
 * otherwise be stale/misleading, so it's not shown.
 */
export function lightColumnText(
  pole: Pick<PoleStatusFields, "lastUpdate" | "lightStatusLabel">,
  customerScoped: boolean,
): string {
  if (!pole.lastUpdate) return "Not Reporting";
  if (isSilentPole(pole.lastUpdate)) {
    return customerScoped ? "Not Reporting" : "Not Reporting 48H";
  }
  return pole.lightStatusLabel ?? "—";
}

/**
 * Panel/Battery show a dash for a silent pole — same treatment as a null
 * label — since a stale panelStatusLabel/batteryStatusLabel from before it
 * stopped reporting isn't meaningfully different from having no reading at
 * all. Appends the idle reason in parentheses only when actually Idle,
 * and only for a pole that's still reporting.
 */
export function panelColumnText(
  pole: Pick<PoleStatusFields, "lastUpdate" | "panelStatusLabel" | "panelIdleReason">,
): string {
  if (isSilentPole(pole.lastUpdate)) return "—";
  const label = pole.panelStatusLabel ?? "—";
  if (label === "Idle" && pole.panelIdleReason) {
    return `${label} (${pole.panelIdleReason})`;
  }
  return label;
}

export function batteryColumnText(
  pole: Pick<PoleStatusFields, "lastUpdate" | "batteryStatusLabel">,
): string {
  if (isSilentPole(pole.lastUpdate)) return "—";
  return pole.batteryStatusLabel ?? "—";
}
