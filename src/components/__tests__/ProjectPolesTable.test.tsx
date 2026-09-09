import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectPolesTable } from "@/components/ProjectPolesTable";
import type { LeadsunProject, PoleVital } from "@/lib/types";

const defaultProps = { customerId: "cust-1", projectId: "proj-1" };

/** A timestamp within the last 48h — isSilentPole compares against the real current time. */
function recentTimestamp(hoursAgo = 1): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

describe("ProjectPolesTable", () => {
  const poles: PoleVital[] = [
    { id: "p1", poleNumber: "51079-1000", locationId: "loc-1", active: true, isOnline: true, lightStatus: "Working", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, lampPower1: null, lampPower2: null, batteryElecCurrent1: null, batteryElecCurrent2: null, solarBoardVoltage: null, solarBoardElecCurrent: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null, sunsetTime: null, lightStatusLabel: null, panelStatusLabel: null, panelIdleReason: null, batteryStatusLabel: null, electricCurrentAverage: null, isLedFault: null, isBatteryFault: null, isPanelFault: null, isOpenIssueFault: null, isPoleFault: null },
    { id: "p2", poleNumber: "51079-1001", locationId: "loc-2", active: true, isOnline: true, lightStatus: "DayLight", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, lampPower1: null, lampPower2: null, batteryElecCurrent1: null, batteryElecCurrent2: null, solarBoardVoltage: null, solarBoardElecCurrent: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null, sunsetTime: null, lightStatusLabel: null, panelStatusLabel: null, panelIdleReason: null, batteryStatusLabel: null, electricCurrentAverage: null, isLedFault: null, isBatteryFault: null, isPanelFault: null, isOpenIssueFault: null, isPoleFault: null },
    { id: "p3", poleNumber: "51079-1002", locationId: "loc-3", active: true, isOnline: false, lightStatus: "Fault", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, lampPower1: null, lampPower2: null, batteryElecCurrent1: null, batteryElecCurrent2: null, solarBoardVoltage: null, solarBoardElecCurrent: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null, sunsetTime: null, lightStatusLabel: null, panelStatusLabel: null, panelIdleReason: null, batteryStatusLabel: null, electricCurrentAverage: null, isLedFault: null, isBatteryFault: null, isPanelFault: null, isOpenIssueFault: null, isPoleFault: null },
    { id: "p4", poleNumber: "51079-1003", locationId: "loc-4", active: true, isOnline: null, lightStatus: null, installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, lampPower1: null, lampPower2: null, batteryElecCurrent1: null, batteryElecCurrent2: null, solarBoardVoltage: null, solarBoardElecCurrent: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null, sunsetTime: null, lightStatusLabel: null, panelStatusLabel: null, panelIdleReason: null, batteryStatusLabel: null, electricCurrentAverage: null, isLedFault: null, isBatteryFault: null, isPanelFault: null, isOpenIssueFault: null, isPoleFault: null },
  ];

  it("renders a row per pole with pole number and online status", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} />);
    expect(screen.getByText("51079-1000")).toBeInTheDocument();
    // 2 rows are online (green "Online" cells), 1 is offline (red "Offline" cell).
    const onlineSpans = screen
      .getAllByText("Online")
      .filter((el) => el.className.includes("status-active"));
    expect(onlineSpans).toHaveLength(2);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("does not render a Working/Light Status column", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} />);
    expect(screen.queryByRole("columnheader", { name: "Working" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Light Status" })).not.toBeInTheDocument();
  });

  it("renders a 48h Overall Status column", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} />);
    expect(screen.getByRole("columnheader", { name: "48h Overall Status" })).toBeInTheDocument();
  });

  it("shows a dash (no color) for Pole Status when isPoleFault is null", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} />);
    // All 4 fixture poles have isPoleFault: null — check the last cell of
    // each row (Pole Status), not just any "—" (OnlineIndicator also shows
    // one for a null online status, e.g. pole p4).
    const rows = screen.getAllByRole("row").slice(1); // skip the header row
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      const poleStatusCell = cells[cells.length - 1];
      expect(poleStatusCell).toHaveTextContent("—");
      expect(poleStatusCell.className).not.toContain("status-active");
      expect(poleStatusCell.className).not.toContain("status-flagged");
    }
  });

  it("shows green OK for Pole Status when isPoleFault is false", () => {
    const polesWithStatus = [{ ...poles[0], isPoleFault: false }];
    render(<ProjectPolesTable poles={polesWithStatus} {...defaultProps} />);

    const ok = screen.getByText("OK");
    expect(ok.className).toContain("text-[var(--status-active)]");
  });

  it("shows red Fault for Pole Status when isPoleFault is true", () => {
    const polesWithStatus = [{ ...poles[0], isPoleFault: true }];
    render(<ProjectPolesTable poles={polesWithStatus} {...defaultProps} />);

    const fault = screen.getByText("Fault");
    expect(fault.className).toContain("text-[var(--status-flagged)]");
  });

  it("shows Online (green, no dot) for isOnline=true", () => {
    render(<ProjectPolesTable poles={[poles[0]]} {...defaultProps} />);
    const onlineCell = screen.getByText("Online");
    expect(onlineCell.className).toContain("text-[var(--status-active)]");
    expect(onlineCell.querySelector("span[aria-hidden]")).toBeFalsy();
  });

  it("shows a colored dot next to the pole number, matching isOnline (same as the top-level Poles list)", () => {
    render(<ProjectPolesTable poles={[poles[0], poles[2], poles[3]]} {...defaultProps} />);
    const onlineLink = screen.getByRole("link", { name: "51079-1000" }); // isOnline: true
    const offlineLink = screen.getByRole("link", { name: "51079-1002" }); // isOnline: false
    const unknownLink = screen.getByRole("link", { name: "51079-1003" }); // isOnline: null
    expect(onlineLink.querySelector("span[aria-hidden]")?.className).toContain(
      "bg-[var(--status-active)]",
    );
    expect(offlineLink.querySelector("span[aria-hidden]")?.className).toContain(
      "bg-[var(--status-flagged)]",
    );
    expect(unknownLink.querySelector("span[aria-hidden]")?.className).toContain(
      "bg-[var(--ink-faint)]",
    );
  });

  it("shows Offline (red, no dot) for isOnline=false", () => {
    render(<ProjectPolesTable poles={[poles[2]]} {...defaultProps} />);
    const offlineCell = screen.getByText("Offline");
    expect(offlineCell.className).toContain("text-[var(--status-flagged)]");
  });

  it("shows Disconnected (red) when isOnline is null but lastUpdate is present", () => {
    const poleWithLastUpdate = { ...poles[3], lastUpdate: "2026-07-26 13:25:41+00:00" };
    render(<ProjectPolesTable poles={[poleWithLastUpdate]} {...defaultProps} />);
    const cell = screen.getByText("Disconnected");
    expect(cell.className).toContain("text-[var(--status-flagged)]");
  });

  it("shows Overall Status as a dash (not Fault) for a Disconnected pole, even though isPoleFault is true", () => {
    const disconnectedButFlagged = {
      ...poles[3],
      lastUpdate: "2026-07-26 13:25:41+00:00",
      isPoleFault: true,
    };
    render(<ProjectPolesTable poles={[disconnectedButFlagged]} {...defaultProps} />);

    expect(screen.getByText("Disconnected")).toBeInTheDocument();
    const row = screen.getByText("Disconnected").closest("tr") as HTMLElement;
    const overallStatusCell = row.querySelectorAll("td")[2];
    expect(overallStatusCell).toHaveTextContent("—");
    expect(overallStatusCell.className).not.toContain("status-flagged");
    expect(overallStatusCell.className).not.toContain("status-active");
  });

  it("shows Overall Status as a dash (not OK) for a Disconnected pole, even though isPoleFault is false", () => {
    const disconnectedButOk = {
      ...poles[3],
      lastUpdate: "2026-07-26 13:25:41+00:00",
      isPoleFault: false,
    };
    render(<ProjectPolesTable poles={[disconnectedButOk]} {...defaultProps} />);

    expect(screen.getByText("Disconnected")).toBeInTheDocument();
    const row = screen.getByText("Disconnected").closest("tr") as HTMLElement;
    const overallStatusCell = row.querySelectorAll("td")[2];
    expect(overallStatusCell).toHaveTextContent("—");
    expect(overallStatusCell.className).not.toContain("status-active");
  });

  it("shows Overall Status as a dash (not Fault) for an Unknown-connected pole, even though isPoleFault is true — data would be inconsistent", () => {
    const unknownButFlagged = { ...poles[3], lastUpdate: null, isPoleFault: true };
    render(<ProjectPolesTable poles={[unknownButFlagged]} {...defaultProps} />);

    expect(screen.getByText("Unknown")).toBeInTheDocument();
    const row = screen.getByText("Unknown").closest("tr") as HTMLElement;
    const overallStatusCell = row.querySelectorAll("td")[2];
    expect(overallStatusCell).toHaveTextContent("—");
    expect(overallStatusCell.className).not.toContain("status-flagged");
    expect(overallStatusCell.className).not.toContain("status-active");
  });

  it("shows Overall Status as a dash (not OK) for an Unknown-connected pole, even though isPoleFault is false", () => {
    const unknownButOk = { ...poles[3], lastUpdate: null, isPoleFault: false };
    render(<ProjectPolesTable poles={[unknownButOk]} {...defaultProps} />);

    expect(screen.getByText("Unknown")).toBeInTheDocument();
    const row = screen.getByText("Unknown").closest("tr") as HTMLElement;
    const overallStatusCell = row.querySelectorAll("td")[2];
    expect(overallStatusCell).toHaveTextContent("—");
    expect(overallStatusCell.className).not.toContain("status-active");
  });

  it("still shows the real Overall Status (OK/Fault) for a pole that is Online (not Disconnected)", () => {
    const onlineWithFault = { ...poles[0], isPoleFault: true };
    render(<ProjectPolesTable poles={[onlineWithFault]} {...defaultProps} />);

    expect(screen.getByText("Online")).toBeInTheDocument();
    const fault = screen.getByText("Fault");
    expect(fault.className).toContain("text-[var(--status-flagged)]");
  });

  it("shows Unknown (neutral) when isOnline and lastUpdate are both null", () => {
    const poleWithNoTelemetry = { ...poles[3], lastUpdate: null };
    render(<ProjectPolesTable poles={[poleWithNoTelemetry]} {...defaultProps} />);
    const cell = screen.getByText("Unknown");
    expect(cell.className).not.toContain("status-active");
    expect(cell.className).not.toContain("status-flagged");
  });

  it("does not show Online or Offline text when isOnline is null", () => {
    render(<ProjectPolesTable poles={[poles[3]]} {...defaultProps} />);
    expect(screen.queryByText("Offline")).not.toBeInTheDocument();
    expect(screen.queryAllByText("Online")).toHaveLength(0);
  });

  it("links the pole number to the pole detail page", () => {
    render(<ProjectPolesTable poles={[poles[0]]} {...defaultProps} />);
    const link = screen.getByRole("link", { name: "51079-1000" });
    expect(link).toHaveAttribute("href", "/customers/cust-1/projects/proj-1/poles/p1");
  });

  it("carries the ?cust_q= search param into the pole link", () => {
    render(<ProjectPolesTable poles={[poles[0]]} {...defaultProps} custQ="coastal" />);
    const link = screen.getByRole("link", { name: "51079-1000" });
    expect(link).toHaveAttribute(
      "href",
      "/customers/cust-1/projects/proj-1/poles/p1?cust_q=coastal",
    );
  });

  it("carries the ?pole_q= search param into the pole link", () => {
    render(<ProjectPolesTable poles={[poles[0]]} {...defaultProps} poleQ="12057" />);
    const link = screen.getByRole("link", { name: "51079-1000" });
    expect(link).toHaveAttribute(
      "href",
      "/customers/cust-1/projects/proj-1/poles/p1?pole_q=12057",
    );
  });

  it("carries both cust_q and pole_q together when both are present", () => {
    render(
      <ProjectPolesTable
        poles={[poles[0]]}
        {...defaultProps}
        custQ="coastal"
        poleQ="12057"
      />,
    );
    const link = screen.getByRole("link", { name: "51079-1000" });
    expect(link).toHaveAttribute(
      "href",
      "/customers/cust-1/projects/proj-1/poles/p1?cust_q=coastal&pole_q=12057",
    );
  });

  it("shows an empty-state message when there are no poles", () => {
    render(<ProjectPolesTable poles={[]} {...defaultProps} />);
    expect(screen.getByText("No poles on file for this project yet.")).toBeInTheDocument();
  });

  it("does not render pagination controls when there are no poles", () => {
    render(<ProjectPolesTable poles={[]} {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  it("paginates at 10 rows per page", async () => {
    const many: PoleVital[] = Array.from({ length: 25 }, (_, i) => ({
      id: `pole-id-${i + 1}`,
      poleNumber: `pole-${i + 1}`,
      locationId: `loc-${i + 1}`,
      active: true,
      isOnline: true,
      lightStatus: "Working",
      installDate: null,
      lat: null,
      long: null,
      lastUpdate: null,
      batteryVoltage1: null,
      batteryVoltage2: null,
      lampPower1: null,
      lampPower2: null,
      batteryElecCurrent1: null,
      batteryElecCurrent2: null,
      solarBoardVoltage: null,
      solarBoardElecCurrent: null,
      avgBatteryPercentage: null,
      avgPanelPercentage: null,
      avgLightPercentage: null,
      sunsetTime: null,
      lightStatusLabel: null,
      panelStatusLabel: null,
      panelIdleReason: null,
      batteryStatusLabel: null,
      electricCurrentAverage: null,
      isLedFault: null,
      isBatteryFault: null,
      isPanelFault: null,
      isOpenIssueFault: null,
      isPoleFault: null,
    }));
    const user = userEvent.setup();
    render(<ProjectPolesTable poles={many} {...defaultProps} />);

    // 10 data rows + 1 header row
    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("pole-1")).toBeInTheDocument();
    expect(screen.queryByText("pole-11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("pole-11")).toBeInTheDocument();
    expect(screen.queryByText("pole-1")).not.toBeInTheDocument();
  });

  it("renders Light, Panel, and Battery column headers", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} />);
    expect(screen.getByRole("columnheader", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Battery" })).toBeInTheDocument();
  });

  it("hides the 48h Connected column entirely when customerScoped is true", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} customerScoped />);
    expect(screen.queryByRole("columnheader", { name: "48h Connected" })).not.toBeInTheDocument();
    expect(screen.queryByText("Online")).not.toBeInTheDocument();
    expect(screen.queryByText("Offline")).not.toBeInTheDocument();
  });

  it("shows the 48h Connected column by default (customerScoped defaults to false)", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} />);
    expect(screen.getByRole("columnheader", { name: "48h Connected" })).toBeInTheDocument();
  });

  it("labels the status column 'Overall Status' (no '48h' prefix) when customerScoped is true", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} customerScoped />);
    expect(screen.getByRole("columnheader", { name: "Overall Status" })).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "48h Overall Status" }),
    ).not.toBeInTheDocument();
  });

  it("labels the status column '48h Overall Status' by default", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} />);
    expect(screen.getByRole("columnheader", { name: "48h Overall Status" })).toBeInTheDocument();
  });

  it("still shows Light/Panel/Battery columns when customerScoped is true", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} customerScoped />);
    expect(screen.getByRole("columnheader", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Battery" })).toBeInTheDocument();
  });

  it("shows 'Not Reporting' (no '48H') in the Light column when the pole has never had any update at all (lastUpdate null)", () => {
    const neverReported = { ...poles[0], lastUpdate: null, lightStatusLabel: "ON" };
    render(<ProjectPolesTable poles={[neverReported]} {...defaultProps} />);
    expect(screen.getByText("Not Reporting")).toBeInTheDocument();
    expect(screen.queryByText("Not Reporting 48H")).not.toBeInTheDocument();
    expect(screen.queryByText("ON")).not.toBeInTheDocument();
  });

  it("shows 'Not Reporting 48H' in the Light column for a pole whose lastUpdate is more than 48h old", () => {
    const staleP = { ...poles[0], lastUpdate: recentTimestamp(72), lightStatusLabel: "OFF" };
    render(<ProjectPolesTable poles={[staleP]} {...defaultProps} />);
    expect(screen.getByText("Not Reporting 48H")).toBeInTheDocument();
  });

  it("distinguishes never-reported ('Not Reporting') from reported-but-stale ('Not Reporting 48H') side by side", () => {
    const neverReported = { ...poles[0], id: "p-never", lastUpdate: null };
    const staleP = { ...poles[1], id: "p-stale", lastUpdate: recentTimestamp(72) };
    render(<ProjectPolesTable poles={[neverReported, staleP]} {...defaultProps} />);

    expect(screen.getByText("Not Reporting")).toBeInTheDocument();
    expect(screen.getByText("Not Reporting 48H")).toBeInTheDocument();
  });

  it("collapses 'Not Reporting 48H' to plain 'Not Reporting' when customerScoped is true, for a reported-but-stale pole", () => {
    const staleP = { ...poles[0], lastUpdate: recentTimestamp(72) };
    render(<ProjectPolesTable poles={[staleP]} {...defaultProps} customerScoped />);

    expect(screen.getByText("Not Reporting")).toBeInTheDocument();
    expect(screen.queryByText("Not Reporting 48H")).not.toBeInTheDocument();
  });

  it("still shows plain 'Not Reporting' when customerScoped is true and the pole has never reported at all", () => {
    const neverReported = { ...poles[0], lastUpdate: null };
    render(<ProjectPolesTable poles={[neverReported]} {...defaultProps} customerScoped />);

    expect(screen.getByText("Not Reporting")).toBeInTheDocument();
  });

  it("shows the real lightStatusLabel in the Light column for a pole reporting within 48h", () => {
    const activePole = { ...poles[0], lastUpdate: recentTimestamp(1), lightStatusLabel: "OFF" };
    render(<ProjectPolesTable poles={[activePole]} {...defaultProps} />);
    expect(screen.getByText("OFF")).toBeInTheDocument();
    expect(screen.queryByText("Not Reporting")).not.toBeInTheDocument();
  });

  it("shows a dash in the Light column when lightStatusLabel is null but the pole is not silent", () => {
    const activePole = { ...poles[0], lastUpdate: recentTimestamp(1), lightStatusLabel: null };
    render(<ProjectPolesTable poles={[activePole]} {...defaultProps} />);
    const row = screen.getByText("51079-1000").closest("tr") as HTMLElement;
    const cells = row.querySelectorAll("td");
    // Pole Number, 48h Connected, 48h Overall Status, Light, Panel, Battery.
    expect(cells[3]).toHaveTextContent("—");
  });

  it("appends the idle reason in parentheses in the Panel column when panelStatusLabel is Idle (pole reporting within 48h)", () => {
    const idlePole = {
      ...poles[0],
      lastUpdate: recentTimestamp(1),
      panelStatusLabel: "Idle",
      panelIdleReason: "Battery Full",
    };
    render(<ProjectPolesTable poles={[idlePole]} {...defaultProps} />);
    expect(screen.getByText("Idle (Battery Full)")).toBeInTheDocument();
  });

  it("does not append a parenthetical in the Panel column when panelStatusLabel is Idle but there's no reason given", () => {
    const idlePole = {
      ...poles[0],
      lastUpdate: recentTimestamp(1),
      panelStatusLabel: "Idle",
      panelIdleReason: null,
    };
    render(<ProjectPolesTable poles={[idlePole]} {...defaultProps} />);
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.queryByText(/Idle \(/)).not.toBeInTheDocument();
  });

  it("does not append the idle reason in the Panel column for a non-Idle panelStatusLabel, even if panelIdleReason happens to be set", () => {
    const chargingPole = {
      ...poles[0],
      lastUpdate: recentTimestamp(1),
      panelStatusLabel: "Charging",
      panelIdleReason: "Battery Full",
    };
    render(<ProjectPolesTable poles={[chargingPole]} {...defaultProps} />);
    expect(screen.getByText("Charging")).toBeInTheDocument();
    expect(screen.queryByText(/Charging \(/)).not.toBeInTheDocument();
  });

  it("shows a dash in the Panel column when panelStatusLabel is null but the pole is not silent", () => {
    const noPanelData = {
      ...poles[0],
      lastUpdate: recentTimestamp(1),
      panelStatusLabel: null,
      panelIdleReason: null,
    };
    render(<ProjectPolesTable poles={[noPanelData]} {...defaultProps} />);
    const row = screen.getByText("51079-1000").closest("tr") as HTMLElement;
    const cells = row.querySelectorAll("td");
    // Pole Number, 48h Connected, 48h Overall Status, Light, Panel, Battery.
    expect(cells[4]).toHaveTextContent("—");
  });

  it("shows the real batteryStatusLabel in the Battery column for a pole reporting within 48h", () => {
    const fullBattery = { ...poles[0], lastUpdate: recentTimestamp(1), batteryStatusLabel: "Full" };
    render(<ProjectPolesTable poles={[fullBattery]} {...defaultProps} />);
    expect(screen.getByText("Full")).toBeInTheDocument();
  });

  it("shows a dash in the Battery column when batteryStatusLabel is null but the pole is not silent", () => {
    const noBatteryData = {
      ...poles[0],
      lastUpdate: recentTimestamp(1),
      batteryStatusLabel: null,
    };
    render(<ProjectPolesTable poles={[noBatteryData]} {...defaultProps} />);
    const row = screen.getByText("51079-1000").closest("tr") as HTMLElement;
    const cells = row.querySelectorAll("td");
    expect(cells[5]).toHaveTextContent("—");
  });

  it("shows a dash in the Panel column for a silent pole, even though panelStatusLabel has a real value", () => {
    const silentPoleWithPanelData = {
      ...poles[0],
      lastUpdate: null,
      panelStatusLabel: "Idle",
      panelIdleReason: "Battery Full",
    };
    render(<ProjectPolesTable poles={[silentPoleWithPanelData]} {...defaultProps} />);
    const row = screen.getByText("51079-1000").closest("tr") as HTMLElement;
    const cells = row.querySelectorAll("td");
    expect(cells[4]).toHaveTextContent("—");
    expect(screen.queryByText(/Idle/)).not.toBeInTheDocument();
  });

  it("shows a dash in the Battery column for a silent pole, even though batteryStatusLabel has a real value", () => {
    const silentPoleWithBatteryData = {
      ...poles[0],
      lastUpdate: recentTimestamp(72),
      batteryStatusLabel: "Full",
    };
    render(<ProjectPolesTable poles={[silentPoleWithBatteryData]} {...defaultProps} />);
    expect(screen.getByText("Not Reporting 48H")).toBeInTheDocument();
    const row = screen.getByText("51079-1000").closest("tr") as HTMLElement;
    const cells = row.querySelectorAll("td");
    expect(cells[5]).toHaveTextContent("—");
    expect(screen.queryByText("Full")).not.toBeInTheDocument();
  });

  it("shows the real Panel/Battery values right up to 48h, and switches to dashes just past it, matching the Light column's own boundary", () => {
    const justUnder48h = {
      ...poles[0],
      lastUpdate: recentTimestamp(47),
      lightStatusLabel: "OFF",
      panelStatusLabel: "Charging",
      batteryStatusLabel: "Full",
    };
    const { rerender } = render(<ProjectPolesTable poles={[justUnder48h]} {...defaultProps} />);
    expect(screen.getByText("OFF")).toBeInTheDocument();
    expect(screen.getByText("Charging")).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();

    const justOver48h = { ...justUnder48h, lastUpdate: recentTimestamp(49) };
    rerender(<ProjectPolesTable poles={[justOver48h]} {...defaultProps} />);
    expect(screen.getByText("Not Reporting 48H")).toBeInTheDocument();
    expect(screen.queryByText("OFF")).not.toBeInTheDocument();
    expect(screen.queryByText("Charging")).not.toBeInTheDocument();
    expect(screen.queryByText("Full")).not.toBeInTheDocument();
  });

  describe("Actions column (Remote Control)", () => {
    const leadsunProject: LeadsunProject = {
      ProjectId: "545",
      ProjectName: "Manatee County - Buffalo Creek",
      totalGateways: 1,
      totalPoles: 1,
      groups: [
        {
          GroupId: 1263,
          GroupName: "Buffalo Creek",
          GatewayCode: "GT12L94A2310260A",
          totalPoles: 1,
          products: [
            {
              ProductId: 12548,
              ProductName: "loc-1",
              ControllerCode: "UPP40LA323110001",
              ProvidedProductId: "AEXSAP4323111877",
              PoleNumber: "AEXSAP4323111877-A",
            },
          ],
        },
      ],
    };

    it("does not render an Actions column when no leadsunProject is given", () => {
      render(<ProjectPolesTable poles={poles} {...defaultProps} />);
      expect(
        screen.queryByRole("columnheader", { name: "Actions" }),
      ).not.toBeInTheDocument();
    });

    it("does not render an Actions column when leadsunProject has no products at all", () => {
      render(
        <ProjectPolesTable
          poles={poles}
          {...defaultProps}
          leadsunProject={{ ...leadsunProject, groups: [] }}
        />,
      );
      expect(
        screen.queryByRole("columnheader", { name: "Actions" }),
      ).not.toBeInTheDocument();
    });

    it("shows the Actions column when at least one pole's locationId matches a product", () => {
      render(
        <ProjectPolesTable poles={poles} {...defaultProps} leadsunProject={leadsunProject} />,
      );
      expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    });

    it("shows a Remote Control link only on the row whose locationId matches, blank on the rest", () => {
      render(
        <ProjectPolesTable poles={poles} {...defaultProps} leadsunProject={leadsunProject} />,
      );
      const matchingRow = screen.getByText("51079-1000").closest("tr") as HTMLElement;
      const otherRow = screen.getByText("51079-1001").closest("tr") as HTMLElement;
      expect(within(matchingRow).getByRole("button", { name: "Remote Control" })).toBeInTheDocument();
      expect(
        within(otherRow).queryByRole("button", { name: "Remote Control" }),
      ).not.toBeInTheDocument();
      // The cell itself is still present (blank), so columns still line up.
      expect(otherRow.querySelectorAll("td")).toHaveLength(
        matchingRow.querySelectorAll("td").length,
      );
    });

    it("opens the stub Remote Control modal when clicked", async () => {
      const user = userEvent.setup();
      render(
        <ProjectPolesTable poles={poles} {...defaultProps} leadsunProject={leadsunProject} />,
      );
      await user.click(screen.getByRole("button", { name: "Remote Control" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("left-aligns the Actions cell, matching the other columns (no text-right)", () => {
      render(
        <ProjectPolesTable poles={poles} {...defaultProps} leadsunProject={leadsunProject} />,
      );
      const matchingRow = screen.getByText("51079-1000").closest("tr") as HTMLElement;
      const actionsCell = matchingRow.querySelector("td:last-child");
      expect(actionsCell?.className).not.toContain("text-right");
    });

    it("uses the accent color for the Remote Control link", () => {
      render(
        <ProjectPolesTable poles={poles} {...defaultProps} leadsunProject={leadsunProject} />,
      );
      const link = screen.getByRole("button", { name: "Remote Control" });
      expect(link.className).toContain("text-[var(--accent)]");
      expect(link.className).not.toContain("--accent-ink");
    });
  });
});
