import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectPolesTable } from "@/components/ProjectPolesTable";
import type { PoleVital } from "@/lib/types";

const defaultProps = { customerId: "cust-1", projectId: "proj-1" };

describe("ProjectPolesTable", () => {
  const poles: PoleVital[] = [
    { id: "p1", poleNumber: "51079-1000", locationId: "loc-1", isOnline: true, lightStatus: "Working", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, lampPower1: null, lampPower2: null, batteryElecCurrent1: null, batteryElecCurrent2: null, solarBoardVoltage: null, solarBoardElecCurrent: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null, isLedFault: null, isBatteryFault: null, isPanelFault: null, isOpenIssueFault: null, isPoleFault: null },
    { id: "p2", poleNumber: "51079-1001", locationId: "loc-2", isOnline: true, lightStatus: "DayLight", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, lampPower1: null, lampPower2: null, batteryElecCurrent1: null, batteryElecCurrent2: null, solarBoardVoltage: null, solarBoardElecCurrent: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null, isLedFault: null, isBatteryFault: null, isPanelFault: null, isOpenIssueFault: null, isPoleFault: null },
    { id: "p3", poleNumber: "51079-1002", locationId: "loc-3", isOnline: false, lightStatus: "Fault", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, lampPower1: null, lampPower2: null, batteryElecCurrent1: null, batteryElecCurrent2: null, solarBoardVoltage: null, solarBoardElecCurrent: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null, isLedFault: null, isBatteryFault: null, isPanelFault: null, isOpenIssueFault: null, isPoleFault: null },
    { id: "p4", poleNumber: "51079-1003", locationId: "loc-4", isOnline: null, lightStatus: null, installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, lampPower1: null, lampPower2: null, batteryElecCurrent1: null, batteryElecCurrent2: null, solarBoardVoltage: null, solarBoardElecCurrent: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null, isLedFault: null, isBatteryFault: null, isPanelFault: null, isOpenIssueFault: null, isPoleFault: null },
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
});
