import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectPolesTable } from "@/components/ProjectPolesTable";
import type { PoleVital } from "@/lib/types";

const defaultProps = { customerId: "cust-1", projectId: "proj-1" };

describe("ProjectPolesTable", () => {
  const poles: PoleVital[] = [
    { id: "p1", poleNumber: "51079-1000", locationId: "loc-1", isOnline: true, lightStatus: "Working", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null },
    { id: "p2", poleNumber: "51079-1001", locationId: "loc-2", isOnline: true, lightStatus: "DayLight", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null },
    { id: "p3", poleNumber: "51079-1002", locationId: "loc-3", isOnline: false, lightStatus: "Fault", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null },
    { id: "p4", poleNumber: "51079-1003", locationId: "loc-4", isOnline: null, lightStatus: null, installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null },
  ];

  it("renders a row per pole with pole number and online status", () => {
    render(<ProjectPolesTable poles={poles} {...defaultProps} />);
    expect(screen.getByText("51079-1000")).toBeInTheDocument();
    // 2 rows are online (green "Online" spans), 1 is offline (red "Offline" span).
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

  it("shows a green dot + Online for isOnline=true", () => {
    render(<ProjectPolesTable poles={[poles[0]]} {...defaultProps} />);
    const onlineCell = screen
      .getAllByText("Online")
      .map((el) => el.closest("span"))
      .find((el) => el && el.tagName === "SPAN");
    expect(onlineCell?.className).toContain("text-[var(--status-active)]");
    expect(onlineCell?.querySelector("span[aria-hidden]")).toBeTruthy();
  });

  it("shows a red dot + Offline for isOnline=false", () => {
    render(<ProjectPolesTable poles={[poles[2]]} {...defaultProps} />);
    const offlineCell = screen.getByText("Offline").closest("span");
    expect(offlineCell?.className).toContain("text-[var(--status-flagged)]");
    expect(offlineCell?.querySelector("span[aria-hidden]")).toBeTruthy();
  });

  it("shows a dash with no dot (not 'Offline') when isOnline is null", () => {
    render(<ProjectPolesTable poles={[poles[3]]} {...defaultProps} />);
    expect(screen.queryByText("Offline")).not.toBeInTheDocument();
    const onlineDataCells = screen.getAllByText("Online").filter((el) => el.tagName === "TD");
    expect(onlineDataCells).toHaveLength(0);
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
      avgBatteryPercentage: null,
      avgPanelPercentage: null,
      avgLightPercentage: null,
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
