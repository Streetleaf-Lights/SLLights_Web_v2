import { describe, expect, it } from "vitest";
import {
  formatLightStatus,
  formatPercent,
  formatTimestamp,
  initials,
  isLightStatusWorking,
  tieredPercentClass,
  workingPercentClass,
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
});

describe("workingPercentClass", () => {
  it("returns the green/active class at exactly 50%", () => {
    expect(workingPercentClass(50)).toBe("text-[var(--status-active)]");
  });

  it("returns the green/active class above 50%", () => {
    expect(workingPercentClass(92.5)).toBe("text-[var(--status-active)]");
  });

  it("returns the red/flagged class below 50%", () => {
    expect(workingPercentClass(49.9)).toBe("text-[var(--status-flagged)]");
  });

  it("returns the red/flagged class at 0%", () => {
    expect(workingPercentClass(0)).toBe("text-[var(--status-flagged)]");
  });

  it("returns the green/active class at 100%", () => {
    expect(workingPercentClass(100)).toBe("text-[var(--status-active)]");
  });
});

describe("formatLightStatus", () => {
  it("labels 'Working' as Working in green", () => {
    expect(formatLightStatus("Working")).toEqual({
      label: "Working",
      className: "text-[var(--status-active)]",
    });
  });

  it("labels 'Daylight' as Working in green too", () => {
    expect(formatLightStatus("Daylight")).toEqual({
      label: "Working",
      className: "text-[var(--status-active)]",
    });
  });

  it("labels the real API's exact 'DayLight' casing as Working in green", () => {
    expect(formatLightStatus("DayLight")).toEqual({
      label: "Working",
      className: "text-[var(--status-active)]",
    });
  });

  it("shows a neutral dash (not red) for a null status, e.g. no telemetry available", () => {
    expect(formatLightStatus(null)).toEqual({
      label: "—",
      className: "text-[var(--ink-faint)]",
    });
  });

  it("shows any other status as-is in red", () => {
    expect(formatLightStatus("Fault")).toEqual({
      label: "Fault",
      className: "text-[var(--status-flagged)]",
    });
  });

  it("shows an unrecognized status string as-is in red", () => {
    expect(formatLightStatus("Offline")).toEqual({
      label: "Offline",
      className: "text-[var(--status-flagged)]",
    });
  });

  it("matches 'working'/'daylight' regardless of casing", () => {
    expect(formatLightStatus("working").label).toBe("Working");
    expect(formatLightStatus("WORKING").label).toBe("Working");
    expect(formatLightStatus("daylight").label).toBe("Working");
    expect(formatLightStatus("DAYLIGHT").label).toBe("Working");
    expect(formatLightStatus("DayLight").label).toBe("Working");
  });

  it("tolerates leading/trailing whitespace from the API", () => {
    expect(formatLightStatus(" Daylight ").label).toBe("Working");
    expect(formatLightStatus(" Working").label).toBe("Working");
  });

  it("preserves the original casing when displaying a non-working status as-is", () => {
    expect(formatLightStatus("FAULT").label).toBe("FAULT");
  });
});

describe("tieredPercentClass", () => {
  it("returns green at/above 80%", () => {
    expect(tieredPercentClass(80)).toBe("text-[var(--status-active)]");
    expect(tieredPercentClass(90.43)).toBe("text-[var(--status-active)]");
    expect(tieredPercentClass(100)).toBe("text-[var(--status-active)]");
  });

  it("returns yellow/warning from 50% up to (but not including) 80%", () => {
    expect(tieredPercentClass(50)).toBe("text-[var(--status-warning)]");
    expect(tieredPercentClass(65)).toBe("text-[var(--status-warning)]");
    expect(tieredPercentClass(79.9)).toBe("text-[var(--status-warning)]");
  });

  it("returns red below 50%", () => {
    expect(tieredPercentClass(49.9)).toBe("text-[var(--status-flagged)]");
    expect(tieredPercentClass(10.79)).toBe("text-[var(--status-flagged)]");
    expect(tieredPercentClass(0)).toBe("text-[var(--status-flagged)]");
  });
});

describe("isLightStatusWorking", () => {
  it("is true for 'Working'", () => {
    expect(isLightStatusWorking("Working")).toBe(true);
  });

  it("is true for the real API's 'DayLight' casing", () => {
    expect(isLightStatusWorking("DayLight")).toBe(true);
  });

  it("is true regardless of casing/whitespace", () => {
    expect(isLightStatusWorking("daylight")).toBe(true);
    expect(isLightStatusWorking(" WORKING ")).toBe(true);
  });

  it("is false for null", () => {
    expect(isLightStatusWorking(null)).toBe(false);
  });

  it("is false for any other status", () => {
    expect(isLightStatusWorking("Fault")).toBe(false);
  });
});

describe("formatTimestamp", () => {
  it("strips a +00:00 offset", () => {
    expect(formatTimestamp("2026-07-26 13:25:41+00:00")).toBe("2026-07-26 13:25:41");
  });

  it("strips a negative offset", () => {
    expect(formatTimestamp("2026-02-11 14:20:05-05:00")).toBe("2026-02-11 14:20:05");
  });

  it("strips a trailing Z", () => {
    expect(formatTimestamp("2026-07-26T13:25:41Z")).toBe("2026-07-26T13:25:41");
  });

  it("returns — for null", () => {
    expect(formatTimestamp(null)).toBe("—");
  });

  it("leaves a timestamp with no offset unchanged", () => {
    expect(formatTimestamp("2026-07-26 13:25:41")).toBe("2026-07-26 13:25:41");
  });
});
