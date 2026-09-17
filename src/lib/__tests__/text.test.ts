import { describe, expect, it } from "vitest";
import {
  connectedLabelClassName,
  connectionStatus,
  formatPercent,
  formatTimestamp,
  initials,
  isSilentPole,
  overallStatusLabelClassName,
  overallStatusLabelWeightClassName,
  panelLabelText,
} from "@/lib/text";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Dana Whitfield")).toBe("DW");
  });

  it("uppercases the result", () => {
    expect(initials("dana whitfield")).toBe("DW");
  });

  it("handles a single-word name", () => {
    expect(initials("Cher")).toBe("C");
  });

  it("caps at two characters for names with more than two words", () => {
    expect(initials("Mary Jane Watson")).toBe("MJ");
  });

  it("works for organization-style names too", () => {
    expect(initials("Coastal Power & Light")).toBe("CP");
  });
});

describe("formatPercent", () => {
  it("rounds to at most 1 decimal place", () => {
    expect(formatPercent(89.77)).toBe("89.8%");
  });

  it("trims a trailing .0 for whole numbers", () => {
    expect(formatPercent(100.0)).toBe("100%");
  });

  it("keeps a single meaningful decimal", () => {
    expect(formatPercent(90.74)).toBe("90.7%");
  });

  it("handles 0", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("returns a dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("returns a dash for undefined", () => {
    expect(formatPercent(undefined)).toBe("—");
  });

  it("returns a dash for NaN", () => {
    expect(formatPercent(NaN)).toBe("—");
  });
});

describe("formatTimestamp", () => {
  it("strips a +00:00 offset and truncates to minutes", () => {
    expect(formatTimestamp("2026-07-26 13:25:41+00:00")).toBe("2026-07-26 13:25");
  });

  it("strips a negative offset and truncates to minutes", () => {
    expect(formatTimestamp("2026-02-11 14:20:05-05:00")).toBe("2026-02-11 14:20");
  });

  it("strips a trailing Z and truncates to minutes", () => {
    expect(formatTimestamp("2026-07-26T13:25:41Z")).toBe("2026-07-26T13:25");
  });

  it("returns — for null", () => {
    expect(formatTimestamp(null)).toBe("—");
  });

  it("returns — for undefined", () => {
    expect(formatTimestamp(undefined)).toBe("—");
  });

  it("truncates seconds even with no offset present", () => {
    expect(formatTimestamp("2026-07-26 13:25:41")).toBe("2026-07-26 13:25");
  });

  it("drops fractional seconds along with the whole seconds part", () => {
    expect(formatTimestamp("2026-09-09 19:40:21.524542-05:00")).toBe("2026-09-09 19:40");
  });

  it("leaves a timestamp that already has no seconds unchanged", () => {
    expect(formatTimestamp("2026-07-26 13:25")).toBe("2026-07-26 13:25");
  });

  it("pads a single-digit minute correctly (no accidental truncation of the minute itself)", () => {
    expect(formatTimestamp("2026-07-26 13:05:41+00:00")).toBe("2026-07-26 13:05");
  });
});

describe("connectionStatus", () => {
  it("shows green Online when isOnline is true", () => {
    expect(connectionStatus(true, "2026-07-26 13:25:41+00:00")).toEqual({
      text: "Online",
      className: "text-[var(--status-active)]",
    });
  });

  it("shows red Offline when isOnline is false", () => {
    expect(connectionStatus(false, "2026-07-26 13:25:41+00:00")).toEqual({
      text: "Offline",
      className: "text-[var(--status-flagged)]",
    });
  });

  it("shows red Disconnected when isOnline is null but lastUpdate is present (has reported before)", () => {
    expect(connectionStatus(null, "2026-07-26 13:25:41+00:00")).toEqual({
      text: "Disconnected",
      className: "text-[var(--status-flagged)]",
    });
  });

  it("shows neutral Unknown when isOnline and lastUpdate are both null (never reported)", () => {
    expect(connectionStatus(null, null)).toEqual({
      text: "Unknown",
      className: "text-[var(--ink-faint)]",
    });
  });

  it("treats undefined the same as null for both isOnline and lastUpdate", () => {
    expect(connectionStatus(undefined, "2026-07-26 13:25:41+00:00")).toEqual({
      text: "Disconnected",
      className: "text-[var(--status-flagged)]",
    });
    expect(connectionStatus(undefined, undefined)).toEqual({
      text: "Unknown",
      className: "text-[var(--ink-faint)]",
    });
  });
});

describe("connectedLabelClassName", () => {
  it("colors 'Online' green", () => {
    expect(connectedLabelClassName("Online")).toBe("text-[var(--status-active)]");
  });

  it("colors 'Offline' red", () => {
    expect(connectedLabelClassName("Offline")).toBe("text-[var(--status-flagged)]");
  });

  it("colors 'Disconnected' red", () => {
    expect(connectedLabelClassName("Disconnected")).toBe("text-[var(--status-flagged)]");
  });

  it("colors 'Unknown' neutral", () => {
    expect(connectedLabelClassName("Unknown")).toBe("text-[var(--ink-faint)]");
  });

  it("colors null/undefined neutral, same as an unrecognized value", () => {
    expect(connectedLabelClassName(null)).toBe("text-[var(--ink-faint)]");
    expect(connectedLabelClassName(undefined)).toBe("text-[var(--ink-faint)]");
  });

  it("colors any unrecognized label neutral, rather than throwing", () => {
    expect(connectedLabelClassName("Some New Value")).toBe("text-[var(--ink-faint)]");
  });
});

describe("overallStatusLabelClassName", () => {
  it("colors 'OK' green", () => {
    expect(overallStatusLabelClassName("OK")).toBe("text-[var(--status-active)]");
  });

  it("colors 'Fault' red", () => {
    expect(overallStatusLabelClassName("Fault")).toBe("text-[var(--status-flagged)]");
  });

  it("colors 'Not Reporting' dark-gray, matching the header's other values (Last Update, Install Date, etc.) rather than the lighter neutral used for a true dash/unknown", () => {
    expect(overallStatusLabelClassName("Not Reporting")).toBe("text-[var(--ink-muted)]");
  });

  it("colors 'Not Reporting 48H' the same dark-gray — a value the old client-side computation never produced", () => {
    expect(overallStatusLabelClassName("Not Reporting 48H")).toBe("text-[var(--ink-muted)]");
  });

  it("colors a dash neutral", () => {
    expect(overallStatusLabelClassName("—")).toBe("text-[var(--ink-faint)]");
  });

  it("colors null/undefined neutral, same as an unrecognized value", () => {
    expect(overallStatusLabelClassName(null)).toBe("text-[var(--ink-faint)]");
    expect(overallStatusLabelClassName(undefined)).toBe("text-[var(--ink-faint)]");
  });
});

describe("overallStatusLabelWeightClassName", () => {
  it("is bold for 'OK'", () => {
    expect(overallStatusLabelWeightClassName("OK")).toBe("font-semibold");
  });

  it("is bold for 'Fault'", () => {
    expect(overallStatusLabelWeightClassName("Fault")).toBe("font-semibold");
  });

  it("is not bold for 'Not Reporting'", () => {
    expect(overallStatusLabelWeightClassName("Not Reporting")).toBe("");
  });

  it("is not bold for 'Not Reporting 48H'", () => {
    expect(overallStatusLabelWeightClassName("Not Reporting 48H")).toBe("");
  });

  it("is not bold for a dash", () => {
    expect(overallStatusLabelWeightClassName("—")).toBe("");
  });

  it("is not bold for null/undefined", () => {
    expect(overallStatusLabelWeightClassName(null)).toBe("");
    expect(overallStatusLabelWeightClassName(undefined)).toBe("");
  });

  it("is not bold for an unrecognized value", () => {
    expect(overallStatusLabelWeightClassName("Some New Value")).toBe("");
  });
});

describe("panelLabelText", () => {
  it("shows the label as-is when it's not Idle", () => {
    expect(panelLabelText({ panelStatusLabel: "Charging", panelIdleReason: null })).toBe(
      "Charging",
    );
  });

  it("appends the idle reason in parentheses when the label is Idle and a reason is given", () => {
    expect(panelLabelText({ panelStatusLabel: "Idle", panelIdleReason: "Battery Full" })).toBe(
      "Idle (Battery Full)",
    );
  });

  it("does not append a parenthetical when Idle but no reason is given", () => {
    expect(panelLabelText({ panelStatusLabel: "Idle", panelIdleReason: null })).toBe("Idle");
  });

  it("does not append the idle reason for a non-Idle label, even if a reason happens to be set", () => {
    expect(panelLabelText({ panelStatusLabel: "Charging", panelIdleReason: "Battery Full" })).toBe(
      "Charging",
    );
  });

  it("shows a dash when panelStatusLabel is null", () => {
    expect(panelLabelText({ panelStatusLabel: null, panelIdleReason: null })).toBe("—");
  });

  it("shows 'Not Reporting 48H' as-is — no isSilentPole/lastUpdate override, unlike panelColumnText", () => {
    expect(
      panelLabelText({ panelStatusLabel: "Not Reporting 48H", panelIdleReason: null }),
    ).toBe("Not Reporting 48H");
  });
});

describe("isSilentPole", () => {
  function hoursAgoTimestamp(hours: number): string {
    return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  }

  it("is false for a lastUpdate within the last 48h", () => {
    expect(isSilentPole(hoursAgoTimestamp(1))).toBe(false);
    expect(isSilentPole(hoursAgoTimestamp(47))).toBe(false);
  });

  it("is true for a lastUpdate more than 48h old", () => {
    expect(isSilentPole(hoursAgoTimestamp(49))).toBe(true);
    expect(isSilentPole(hoursAgoTimestamp(24 * 30))).toBe(true);
  });

  it("is true when lastUpdate is null or undefined (never reported)", () => {
    expect(isSilentPole(null)).toBe(true);
    expect(isSilentPole(undefined)).toBe(true);
  });

  it("is true for an unparseable lastUpdate", () => {
    expect(isSilentPole("not-a-real-date")).toBe(true);
  });
});
