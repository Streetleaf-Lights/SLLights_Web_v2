import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PoleSummary } from "@/lib/types";

const { useSearchParamsMock } = vi.hoisted(() => ({ useSearchParamsMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
}));

import { PolesTable } from "@/components/PolesTable";

describe("PolesTable", () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  const poles: PoleSummary[] = [
    {
      id: "recFrbkdOnCqdCDjt",
      poleNumber: "12057-2689033877",
      locationId: "TEC-2689033877",
      installDate: "2022-04-06",
      lat: 27.74143766,
      long: -82.40508593,
      lastUpdate: "2026-07-26 13:25:41+00:00",
      lightStatus: "DayLight",
      isOnline: true,
      avgBatteryPercentage: 80.06,
      avgPanelPercentage: 19.32,
      avgLightPercentage: 0.0,
      lampPower1: 0,
      lampPower2: 0,
      batteryElecCurrent1: 0,
      batteryElecCurrent2: 0,
      solarBoardVoltage: 0,
      solarBoardElecCurrent: 0,
      batteryChargingMin: 0,
      isLedFault: false,
      isBatteryFault: false,
      isPanelFault: false,
      isOpenIssueFault: false,
      isPoleFault: false,
      projectId: "rec3ZJtlb5vqkHPS1",
      customerId: "recwx649JfiRmWqxF",
    },
    {
      id: "recSecondPole",
      poleNumber: "12057-2689033878",
      locationId: "TEC-2689033878",
      installDate: null,
      lat: null,
      long: null,
      lastUpdate: "2026-07-26 13:25:41+00:00",
      lightStatus: null,
      isOnline: false,
      avgBatteryPercentage: null,
      avgPanelPercentage: null,
      avgLightPercentage: null,
      lampPower1: null,
      lampPower2: null,
      batteryElecCurrent1: null,
      batteryElecCurrent2: null,
      solarBoardVoltage: null,
      solarBoardElecCurrent: null,
      batteryChargingMin: null,
      isLedFault: null,
      isBatteryFault: null,
      isPanelFault: null,
      isOpenIssueFault: null,
      isPoleFault: null,
      projectId: "recOtherProject",
      customerId: "recOtherCustomer",
    },
  ];

  it("renders the pole number linked to its detail page", () => {
    render(<PolesTable poles={poles} />);
    const link = screen.getByRole("link", { name: "12057-2689033877" });
    expect(link).toHaveAttribute(
      "href",
      "/customers/recwx649JfiRmWqxF/projects/rec3ZJtlb5vqkHPS1/poles/recFrbkdOnCqdCDjt",
    );
  });

  it("does not append ?pole_q= when there is no active search", () => {
    render(<PolesTable poles={poles} />);
    const link = screen.getByRole("link", { name: "12057-2689033877" });
    expect(link.getAttribute("href")).not.toContain("pole_q");
  });

  it("carries the current search into the pole detail link as ?pole_q=", async () => {
    const user = userEvent.setup();
    render(<PolesTable poles={poles} />);
    await user.type(screen.getByPlaceholderText("Search by pole number…"), "877");

    const link = screen.getByRole("link", { name: "12057-2689033877" });
    expect(link).toHaveAttribute(
      "href",
      "/customers/recwx649JfiRmWqxF/projects/rec3ZJtlb5vqkHPS1/poles/recFrbkdOnCqdCDjt?pole_q=877",
    );
  });

  it("seeds the search box from the ?pole_q= URL param", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("pole_q=878"));
    render(<PolesTable poles={poles} />);

    expect(screen.getByPlaceholderText("Search by pole number…")).toHaveValue("878");
    expect(screen.getByText("12057-2689033878")).toBeInTheDocument();
    expect(screen.queryByText("12057-2689033877")).not.toBeInTheDocument();
  });

  it("clears the search box when navigating to a URL without ?pole_q=, even without unmounting", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("pole_q=878"));
    const { rerender } = render(<PolesTable poles={poles} />);
    expect(screen.getByPlaceholderText("Search by pole number…")).toHaveValue("878");

    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    rerender(<PolesTable poles={poles} />);

    expect(screen.getByPlaceholderText("Search by pole number…")).toHaveValue("");
    expect(screen.getByText("12057-2689033877")).toBeInTheDocument();
    expect(screen.getByText("12057-2689033878")).toBeInTheDocument();
  });

  it("shows a green dot in front of the pole number when isOnline is true", () => {
    render(<PolesTable poles={poles} />);
    const link = screen.getByRole("link", { name: "12057-2689033877" });
    const dot = link.querySelector("span[aria-hidden]");
    expect(dot?.className).toContain("bg-[var(--status-active)]");
  });

  it("shows a red dot in front of the pole number when isOnline is false", () => {
    render(<PolesTable poles={poles} />);
    const link = screen.getByRole("link", { name: "12057-2689033878" });
    const dot = link.querySelector("span[aria-hidden]");
    expect(dot?.className).toContain("bg-[var(--status-flagged)]");
  });

  it("shows Installed on the second line of column 1", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByText("Installed: 2022-04-06")).toBeInTheDocument();
  });

  it("shows a dash for Installed when a pole has no telemetry", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByText("Installed: —")).toBeInTheDocument();
  });

  it("does not render Last update anywhere on the row", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.queryByText(/Last update/)).not.toBeInTheDocument();
  });

  it("column 2 shows Online status and Lat/Long coordinates", () => {
    render(<PolesTable poles={poles} />);
    const rows = screen.getAllByRole("row");
    const row1 = within(rows[1]);
    expect(row1.getByText("Online")).toBeInTheDocument();
    expect(row1.getByText("27.74143766, -82.40508593")).toBeInTheDocument();
  });

  it("shows red Offline and dashed coordinates for a pole with no location", () => {
    render(<PolesTable poles={poles} />);
    const rows = screen.getAllByRole("row");
    const row2 = within(rows[2]);
    expect(row2.getByText("Offline").className).toContain("text-[var(--status-flagged)]");
    expect(row2.getByText("—, —")).toBeInTheDocument();
  });

  it("shows Disconnected (red) for 48h Connected when isOnline is null but lastUpdate is present (has reported before)", () => {
    render(<PolesTable poles={[{ ...poles[0], isOnline: null }]} />);
    const cell = screen.getByText("Disconnected");
    expect(cell.className).toContain("text-[var(--status-flagged)]");
  });

  it("shows Unknown (neutral) for 48h Connected when isOnline and lastUpdate are both null (never reported)", () => {
    render(<PolesTable poles={[{ ...poles[0], isOnline: null, lastUpdate: null }]} />);
    const cell = screen.getByText("Unknown");
    expect(cell.className).not.toContain("status-active");
    expect(cell.className).not.toContain("status-flagged");
  });

  it("does not render a Customer/Project column", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.queryByText(/Customer:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Project:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Customer/ })).not.toBeInTheDocument();
  });

  it("labels the columns Pole / 48h Connected / Statuses", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByRole("columnheader", { name: "48h Connected" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Statuses" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Online / Location" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "System Status" })).not.toBeInTheDocument();
  });

  it("Statuses is a single boxed group with Light, Panel, and Battery in that order", () => {
    render(<PolesTable poles={poles} />);
    const panel = screen.getByLabelText("19.3% Panel");
    const battery = screen.getByLabelText("80.1% Battery");
    const light = screen.getByLabelText("0% Light");
    // All three share the same box (grandparent), confirming it's one group, not 3 separate boxes.
    expect(panel.parentElement).toBe(battery.parentElement);
    expect(panel.parentElement).toBe(light.parentElement);
    expect(panel.parentElement?.parentElement?.className).toContain("rounded-lg");

    // Light, Panel, Battery in that left-to-right order.
    const box = panel.parentElement as HTMLElement;
    const columns = Array.from(box.children).map((col) => col.textContent);
    expect(columns).toEqual([light.textContent, panel.textContent, battery.textContent]);
  });

  it("does not color-code Panel/Battery/Light values (Statuses is neutral now)", () => {
    render(<PolesTable poles={poles} />);
    const panel = screen.getByLabelText("19.3% Panel");
    const battery = screen.getByLabelText("80.1% Battery");
    const light = screen.getByLabelText("0% Light");
    for (const stat of [panel, battery, light]) {
      const valueClass = stat.querySelector("div")?.className ?? "";
      expect(valueClass).not.toContain("text-[var(--status-active)]");
      expect(valueClass).not.toContain("text-[var(--status-flagged)]");
      expect(valueClass).not.toContain("text-[var(--status-warning)]");
    }
  });

  it("does not crash when lightStatus is undefined (not just null) while avgLightPercentage is present", () => {
    // The real API sometimes omits lightStatus entirely rather than nulling
    // it, even when avgLightPercentage is a real number — this reproduces
    // that exact combination.
    const poleWithMissingLightStatus = {
      ...poles[0],
      lightStatus: undefined,
    } as unknown as PoleSummary;
    render(<PolesTable poles={[poleWithMissingLightStatus]} />);

    expect(screen.getByLabelText("0% Light")).toBeInTheDocument();
  });

  it("shows dashes in Statuses for a pole with no telemetry", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByLabelText("— Panel")).toBeInTheDocument();
    expect(screen.getByLabelText("— Battery")).toBeInTheDocument();
    expect(screen.getByLabelText("— Light")).toBeInTheDocument();
  });

  it("does not crash and shows a dash when lat/long are undefined (not just null)", () => {
    const poleWithMissingCoordinates = {
      ...poles[0],
      lat: undefined,
      long: undefined,
    } as unknown as PoleSummary;
    render(<PolesTable poles={[poleWithMissingCoordinates]} />);

    expect(screen.getByText("—, —")).toBeInTheDocument();
  });

  it("filters by pole number as you type", async () => {
    const user = userEvent.setup();
    render(<PolesTable poles={poles} />);
    await user.type(screen.getByPlaceholderText("Search by pole number…"), "878");

    expect(screen.queryByText("12057-2689033877")).not.toBeInTheDocument();
    expect(screen.getByText("12057-2689033878")).toBeInTheDocument();
    expect(screen.getByText("1 pole")).toBeInTheDocument();
  });

  it("shows a message when the search matches nothing", async () => {
    const user = userEvent.setup();
    render(<PolesTable poles={poles} />);
    await user.type(screen.getByPlaceholderText("Search by pole number…"), "no-such-pole");

    expect(screen.getByText("No poles match your search.")).toBeInTheDocument();
  });

  it("shows a message when there are no poles at all", () => {
    render(<PolesTable poles={[]} />);
    expect(screen.getByText("No poles on file yet.")).toBeInTheDocument();
  });

  it("paginates at 10 rows per page", async () => {
    const many: PoleSummary[] = Array.from({ length: 25 }, (_, i) => ({
      id: `pole-id-${i + 1}`,
      poleNumber: `pole-${i + 1}`,
      locationId: `loc-${i + 1}`,
      installDate: null,
      lat: null,
      long: null,
      lastUpdate: null,
      lightStatus: null,
      isOnline: null,
      avgBatteryPercentage: null,
      avgPanelPercentage: null,
      avgLightPercentage: null,
      lampPower1: null,
      lampPower2: null,
      batteryElecCurrent1: null,
      batteryElecCurrent2: null,
      solarBoardVoltage: null,
      solarBoardElecCurrent: null,
      batteryChargingMin: null,
      isLedFault: null,
      isBatteryFault: null,
      isPanelFault: null,
      isOpenIssueFault: null,
      isPoleFault: null,
      projectId: "proj-1",
      customerId: "cust-1",
    }));
    const user = userEvent.setup();
    render(<PolesTable poles={many} />);

    // 10 data rows + 1 header row
    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("pole-1")).toBeInTheDocument();
    expect(screen.queryByText("pole-11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("pole-11")).toBeInTheDocument();
    expect(screen.queryByText("pole-1")).not.toBeInTheDocument();
  });

  it("resets to page 1 when the search changes", async () => {
    const many: PoleSummary[] = Array.from({ length: 25 }, (_, i) => ({
      id: `pole-id-${i + 1}`,
      poleNumber: `pole-${i + 1}`,
      locationId: `loc-${i + 1}`,
      installDate: null,
      lat: null,
      long: null,
      lastUpdate: null,
      lightStatus: null,
      isOnline: null,
      avgBatteryPercentage: null,
      avgPanelPercentage: null,
      avgLightPercentage: null,
      lampPower1: null,
      lampPower2: null,
      batteryElecCurrent1: null,
      batteryElecCurrent2: null,
      solarBoardVoltage: null,
      solarBoardElecCurrent: null,
      batteryChargingMin: null,
      isLedFault: null,
      isBatteryFault: null,
      isPanelFault: null,
      isOpenIssueFault: null,
      isPoleFault: null,
      projectId: "proj-1",
      customerId: "cust-1",
    }));
    const user = userEvent.setup();
    render(<PolesTable poles={many} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("pole-11")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search by pole number…"), "pole-2");
    expect(screen.getByText("pole-2")).toBeInTheDocument();
  });
});
