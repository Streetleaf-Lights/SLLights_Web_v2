import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PoleVitalsChart } from "@/components/PoleVitalsChart";

// Recharts' ResponsiveContainer needs real DOM dimensions to render its
// children (legend, lines, axes); jsdom reports 0x0 by default, which
// causes it to render nothing. Force a plausible size for these tests.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 600,
    height: 256,
    top: 0,
    left: 0,
    bottom: 256,
    right: 600,
    x: 0,
    y: 0,
    toJSON() {
      return this;
    },
  })) as typeof Element.prototype.getBoundingClientRect;
});

function mockVitalsResponse(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  });
}

const sampleVitals = [
  {
    periodStart: "2026-07-30 11:00:00-04:00",
    periodEnd: "2026-07-30 12:00:00-04:00",
    lightStatus: "DayLight",
    isOnline: true,
    avgBatteryPercentage: 100.0,
    avgPanelPercentage: 60.3,
    avgLightPercentage: 0.0,
  },
  {
    periodStart: "2026-07-30 09:00:00-04:00",
    periodEnd: "2026-07-30 10:00:00-04:00",
    lightStatus: "DayLight",
    isOnline: true,
    avgBatteryPercentage: 95.0,
    avgPanelPercentage: 40.1,
    avgLightPercentage: 0.0,
  },
];

describe("PoleVitalsChart", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a loading state before the fetch resolves", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

    render(<PoleVitalsChart poleId="recAOlPiepBddUcCv" />);

    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });

  it("fetches Hourly data with limit=48 by default", async () => {
    const fetchMock = mockVitalsResponse(true, { vitals: sampleVitals });
    vi.stubGlobal("fetch", fetchMock);

    render(<PoleVitalsChart poleId="recAOlPiepBddUcCv" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/getpolevitalsbyperiod?poleId=recAOlPiepBddUcCv&periodType=Hour&limit=48",
    );
  });

  it("re-fetches with periodType=Day and limit=30 when Daily is clicked", async () => {
    const fetchMock = mockVitalsResponse(true, { vitals: sampleVitals });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<PoleVitalsChart poleId="recAOlPiepBddUcCv" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Daily" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/getpolevitalsbyperiod?poleId=recAOlPiepBddUcCv&periodType=Day&limit=30",
    );
  });

  it("marks the active period button with aria-pressed", async () => {
    vi.stubGlobal("fetch", mockVitalsResponse(true, { vitals: sampleVitals }));

    const user = userEvent.setup();
    render(<PoleVitalsChart poleId="recAOlPiepBddUcCv" />);
    await screen.findByText("Battery %");

    expect(screen.getByRole("button", { name: "Hourly" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Daily" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Daily" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Daily" })).toHaveAttribute("aria-pressed", "true"),
    );
  });

  it("renders the chart legend once data loads", async () => {
    vi.stubGlobal("fetch", mockVitalsResponse(true, { vitals: sampleVitals }));

    render(<PoleVitalsChart poleId="recAOlPiepBddUcCv" />);

    expect(await screen.findByText("Battery %")).toBeInTheDocument();
    expect(screen.getByText("Panel %")).toBeInTheDocument();
    expect(screen.getByText("Light %")).toBeInTheDocument();
  });

  it("does not crash when a vital entry has a missing/undefined periodStart", async () => {
    const vitalsWithMissingPeriodStart = [
      { ...sampleVitals[0], periodStart: undefined },
      sampleVitals[1],
    ];
    vi.stubGlobal("fetch", mockVitalsResponse(true, { vitals: vitalsWithMissingPeriodStart }));

    render(<PoleVitalsChart poleId="recAOlPiepBddUcCv" />);

    expect(await screen.findByText("Battery %")).toBeInTheDocument();
  });

  it("shows an empty-state message when there is no vitals history", async () => {
    vi.stubGlobal("fetch", mockVitalsResponse(true, { vitals: [] }));

    render(<PoleVitalsChart poleId="recAOlPiepBddUcCv" />);

    expect(
      await screen.findByText("No vitals history available for this pole."),
    ).toBeInTheDocument();
  });

  it("shows the server's error message on failure (e.g. pole not found)", async () => {
    vi.stubGlobal("fetch", mockVitalsResponse(false, { error: "pole not found" }));

    render(<PoleVitalsChart poleId="does-not-exist" />);

    expect(await screen.findByText("pole not found")).toBeInTheDocument();
  });

  it("shows a fallback error message when the request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<PoleVitalsChart poleId="recAOlPiepBddUcCv" />);

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });

  it("clears a previous error when switching periods successfully", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "pole not found" }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ vitals: sampleVitals }) });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<PoleVitalsChart poleId="recAOlPiepBddUcCv" />);
    await screen.findByText("pole not found");

    await user.click(screen.getByRole("button", { name: "Daily" }));

    await screen.findByText("Battery %");
    expect(screen.queryByText("pole not found")).not.toBeInTheDocument();
  });
});
