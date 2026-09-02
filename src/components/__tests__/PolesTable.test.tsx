import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PoleSummary } from "@/lib/types";

const { useSearchParamsMock } = vi.hoisted(() => ({ useSearchParamsMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useSearchParams: useSearchParamsMock,
}));

import { PolesTable } from "@/components/PolesTable";

/** A timestamp within the last 48h — isSilentPole compares against the real current time. */
function recentTimestamp(hoursAgo = 1): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function makePole(overrides: Partial<PoleSummary> = {}): PoleSummary {
  return {
    id: "recFrbkdOnCqdCDjt",
    poleNumber: "12057-2689033877",
    locationId: "TEC-2689033877",
    active: true,
    installDate: "2022-04-06",
    lat: 27.74143766,
    long: -82.40508593,
    lastUpdate: null,
    lightStatus: "DayLight",
    isOnline: true,
    avgBatteryPercentage: null,
    avgPanelPercentage: null,
    avgLightPercentage: null,
    sunsetTime: null,
    lightStatusLabel: null,
    panelStatusLabel: null,
    panelIdleReason: null,
    batteryStatusLabel: null,
    electricCurrentAverage: null,
    lampPower1: null,
    lampPower2: null,
    batteryElecCurrent1: null,
    batteryElecCurrent2: null,
    solarBoardVoltage: null,
    solarBoardElecCurrent: null,
    isLedFault: null,
    isBatteryFault: null,
    isPanelFault: null,
    isOpenIssueFault: null,
    isPoleFault: null,
    projectId: "rec3ZJtlb5vqkHPS1",
    customerId: "recwx649JfiRmWqxF",
    ...overrides,
  };
}

describe("PolesTable", () => {
  beforeEach(() => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  const poles: PoleSummary[] = [
    makePole({ id: "p1", poleNumber: "51079-1000", isOnline: true }),
    makePole({
      id: "p2",
      poleNumber: "51079-1001",
      isOnline: true,
      projectId: "recOtherProject",
      customerId: "recOtherCustomer",
    }),
    makePole({ id: "p3", poleNumber: "51079-1002", isOnline: false }),
    makePole({ id: "p4", poleNumber: "51079-1003", isOnline: null }),
  ];

  it("renders a row per pole with pole number and online status", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByText("51079-1000")).toBeInTheDocument();
    // 2 rows are online (green "Online" cells), 1 is offline (red "Offline" cell).
    const onlineSpans = screen
      .getAllByText("Online")
      .filter((el) => el.className.includes("status-active"));
    expect(onlineSpans).toHaveLength(2);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("does not render a Statuses/percentage column", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.queryByRole("columnheader", { name: "Statuses" })).not.toBeInTheDocument();
  });

  it("renders a 48h Overall Status column", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByRole("columnheader", { name: "48h Overall Status" })).toBeInTheDocument();
  });

  it("labels the first column Pole Number", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByRole("columnheader", { name: "Pole Number" })).toBeInTheDocument();
  });

  it("renders Light, Panel, and Battery column headers", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByRole("columnheader", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Battery" })).toBeInTheDocument();
  });

  it("shows a dash (no color) for Overall Status when isPoleFault is null", () => {
    render(<PolesTable poles={poles} />);
    const rows = screen.getAllByRole("row").slice(1); // skip the header row
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      const overallStatusCell = cells[2]; // Pole Number, 48h Connected, Overall Status, ...
      expect(overallStatusCell).toHaveTextContent("—");
      expect(overallStatusCell.className).not.toContain("status-active");
      expect(overallStatusCell.className).not.toContain("status-flagged");
    }
  });

  it("shows green OK for Overall Status when isPoleFault is false", () => {
    render(<PolesTable poles={[makePole({ isPoleFault: false })]} />);
    const ok = screen.getByText("OK");
    expect(ok.className).toContain("text-[var(--status-active)]");
  });

  it("shows red Fault for Overall Status when isPoleFault is true", () => {
    render(<PolesTable poles={[makePole({ isPoleFault: true })]} />);
    const fault = screen.getByText("Fault");
    expect(fault.className).toContain("text-[var(--status-flagged)]");
  });

  it("shows Overall Status as a dash (not Fault) for a Disconnected pole, even though isPoleFault is true", () => {
    render(
      <PolesTable
        poles={[
          makePole({ isOnline: null, lastUpdate: "2026-07-26 13:25:41+00:00", isPoleFault: true }),
        ]}
      />,
    );
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
    const row = screen.getByText("Disconnected").closest("tr") as HTMLElement;
    const overallStatusCell = row.querySelectorAll("td")[2];
    expect(overallStatusCell).toHaveTextContent("—");
    expect(overallStatusCell.className).not.toContain("status-flagged");
  });

  it("shows Overall Status as a dash (not Fault) for an Unknown-connected pole, even though isPoleFault is true — data would be inconsistent", () => {
    render(<PolesTable poles={[makePole({ isOnline: null, lastUpdate: null, isPoleFault: true })]} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    const row = screen.getByText("Unknown").closest("tr") as HTMLElement;
    const overallStatusCell = row.querySelectorAll("td")[2];
    expect(overallStatusCell).toHaveTextContent("—");
    expect(overallStatusCell.className).not.toContain("status-flagged");
    expect(overallStatusCell.className).not.toContain("status-active");
  });

  it("shows Disconnected (red) for 48h Connected when isOnline is null but lastUpdate is present (has reported before)", () => {
    render(
      <PolesTable poles={[makePole({ isOnline: null, lastUpdate: "2026-07-26 13:25:41+00:00" })]} />,
    );
    const cell = screen.getByText("Disconnected");
    expect(cell.className).toContain("text-[var(--status-flagged)]");
  });

  it("shows Unknown (neutral) for 48h Connected when isOnline and lastUpdate are both null (never reported)", () => {
    render(<PolesTable poles={[makePole({ isOnline: null, lastUpdate: null })]} />);
    const cell = screen.getByText("Unknown");
    expect(cell.className).not.toContain("status-active");
    expect(cell.className).not.toContain("status-flagged");
  });

  it("shows 'Not Reporting' (no '48H') in the Light column when the pole has never had any update at all (lastUpdate null)", () => {
    render(<PolesTable poles={[makePole({ lastUpdate: null, lightStatusLabel: "ON" })]} />);
    expect(screen.getByText("Not Reporting")).toBeInTheDocument();
    expect(screen.queryByText("Not Reporting 48H")).not.toBeInTheDocument();
    expect(screen.queryByText("ON")).not.toBeInTheDocument();
  });

  it("shows 'Not Reporting 48H' in the Light column for a pole whose lastUpdate is more than 48h old", () => {
    render(
      <PolesTable poles={[makePole({ lastUpdate: recentTimestamp(72), lightStatusLabel: "OFF" })]} />,
    );
    expect(screen.getByText("Not Reporting 48H")).toBeInTheDocument();
  });

  it("shows the real lightStatusLabel in the Light column for a pole reporting within 48h", () => {
    render(
      <PolesTable poles={[makePole({ lastUpdate: recentTimestamp(1), lightStatusLabel: "OFF" })]} />,
    );
    expect(screen.getByText("OFF")).toBeInTheDocument();
    expect(screen.queryByText("Not Reporting")).not.toBeInTheDocument();
  });

  it("appends the idle reason in parentheses in the Panel column when panelStatusLabel is Idle", () => {
    render(
      <PolesTable
        poles={[
          makePole({
            lastUpdate: recentTimestamp(1),
            panelStatusLabel: "Idle",
            panelIdleReason: "Battery Full",
          }),
        ]}
      />,
    );
    expect(screen.getByText("Idle (Battery Full)")).toBeInTheDocument();
  });

  it("shows the real batteryStatusLabel in the Battery column for a pole reporting within 48h", () => {
    render(
      <PolesTable poles={[makePole({ lastUpdate: recentTimestamp(1), batteryStatusLabel: "Full" })]} />,
    );
    expect(screen.getByText("Full")).toBeInTheDocument();
  });

  it("shows a dash in the Panel/Battery columns for a silent pole, even with real label data", () => {
    render(
      <PolesTable
        poles={[
          makePole({
            lastUpdate: null,
            panelStatusLabel: "Idle",
            panelIdleReason: "Battery Full",
            batteryStatusLabel: "Full",
          }),
        ]}
      />,
    );
    const row = screen.getByText("12057-2689033877").closest("tr") as HTMLElement;
    const cells = row.querySelectorAll("td");
    // Pole Number, 48h Connected, 48h Overall Status, Light, Panel, Battery.
    expect(cells[4]).toHaveTextContent("—");
    expect(cells[5]).toHaveTextContent("—");
    expect(screen.queryByText(/Idle/)).not.toBeInTheDocument();
    expect(screen.queryByText("Full")).not.toBeInTheDocument();
  });

  it("hides the 48h Connected column entirely when customerScoped is true", () => {
    render(<PolesTable poles={poles} customerScoped />);
    expect(screen.queryByRole("columnheader", { name: "48h Connected" })).not.toBeInTheDocument();
    expect(screen.queryByText("Online")).not.toBeInTheDocument();
    expect(screen.queryByText("Offline")).not.toBeInTheDocument();
  });

  it("shows the 48h Connected column by default (customerScoped defaults to false)", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByRole("columnheader", { name: "48h Connected" })).toBeInTheDocument();
  });

  it("labels the status column 'Overall Status' (no '48h' prefix) when customerScoped is true", () => {
    render(<PolesTable poles={poles} customerScoped />);
    expect(screen.getByRole("columnheader", { name: "Overall Status" })).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "48h Overall Status" }),
    ).not.toBeInTheDocument();
  });

  it("collapses 'Not Reporting 48H' to plain 'Not Reporting' when customerScoped is true, for a reported-but-stale pole", () => {
    render(
      <PolesTable poles={[makePole({ lastUpdate: recentTimestamp(72) })]} customerScoped />,
    );
    expect(screen.getByText("Not Reporting")).toBeInTheDocument();
    expect(screen.queryByText("Not Reporting 48H")).not.toBeInTheDocument();
  });

  it("renders the pole number linked to its detail page", () => {
    render(<PolesTable poles={poles} />);
    const link = screen.getByRole("link", { name: "51079-1000" });
    expect(link).toHaveAttribute(
      "href",
      "/customers/recwx649JfiRmWqxF/projects/rec3ZJtlb5vqkHPS1/poles/p1",
    );
  });

  it("does not append ?pole_q= when there is no active search", () => {
    render(<PolesTable poles={poles} />);
    const link = screen.getByRole("link", { name: "51079-1000" });
    expect(link.getAttribute("href")).not.toContain("pole_q");
  });

  it("carries the current search into the pole detail link as ?pole_q=", async () => {
    const user = userEvent.setup();
    render(<PolesTable poles={poles} />);
    await user.type(screen.getByPlaceholderText("Search by pole number…"), "1000");

    const link = screen.getByRole("link", { name: "51079-1000" });
    expect(link).toHaveAttribute(
      "href",
      "/customers/recwx649JfiRmWqxF/projects/rec3ZJtlb5vqkHPS1/poles/p1?pole_q=1000",
    );
  });

  it("seeds the search box from the ?pole_q= URL param", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("pole_q=1001"));
    render(<PolesTable poles={poles} />);

    expect(screen.getByPlaceholderText("Search by pole number…")).toHaveValue("1001");
    expect(screen.getByText("51079-1001")).toBeInTheDocument();
    expect(screen.queryByText("51079-1000")).not.toBeInTheDocument();
  });

  it("clears the search box when navigating to a URL without ?pole_q=, even without unmounting", () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("pole_q=1001"));
    const { rerender } = render(<PolesTable poles={poles} />);
    expect(screen.getByPlaceholderText("Search by pole number…")).toHaveValue("1001");

    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    rerender(<PolesTable poles={poles} />);

    expect(screen.getByPlaceholderText("Search by pole number…")).toHaveValue("");
    expect(screen.getByText("51079-1000")).toBeInTheDocument();
    expect(screen.getByText("51079-1001")).toBeInTheDocument();
  });

  it("shows a green dot in front of the pole number when isOnline is true", () => {
    render(<PolesTable poles={poles} />);
    const link = screen.getByRole("link", { name: "51079-1000" });
    const dot = link.querySelector("span[aria-hidden]");
    expect(dot?.className).toContain("bg-[var(--status-active)]");
  });

  it("shows a red dot in front of the pole number when isOnline is false", () => {
    render(<PolesTable poles={poles} />);
    const link = screen.getByRole("link", { name: "51079-1002" });
    const dot = link.querySelector("span[aria-hidden]");
    expect(dot?.className).toContain("bg-[var(--status-flagged)]");
  });

  it("shows a neutral dot in front of the pole number when isOnline is null", () => {
    render(<PolesTable poles={poles} />);
    const link = screen.getByRole("link", { name: "51079-1003" });
    const dot = link.querySelector("span[aria-hidden]");
    expect(dot?.className).toContain("bg-[var(--ink-faint)]");
  });

  it("does not render a Customer/Project column by default (no customerName/projectName given)", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.queryByText(/Customer:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Project:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Customer/ })).not.toBeInTheDocument();
  });

  it("shows both Customer and Project columns when both are given (arriving via a faults link)", () => {
    render(
      <PolesTable
        poles={[poles[0]]}
        customerName="Coastal Power & Light"
        projectNames={{ [poles[0].projectId]: "Bayou District Rebuild" }}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Customer" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByText("Coastal Power & Light")).toBeInTheDocument();
    expect(screen.getByText("Bayou District Rebuild")).toBeInTheDocument();
  });

  it("looks up each row's own project name via its projectId, spanning multiple projects (the customer-level aggregate fault link)", () => {
    render(
      <PolesTable
        poles={poles}
        projectNames={{
          [poles[0].projectId]: "Bayou District Rebuild",
          [poles[1].projectId]: "Storm Hardening Phase 2",
        }}
      />,
    );
    expect(screen.getAllByText("Bayou District Rebuild").length).toBeGreaterThan(0);
    expect(screen.getByText("Storm Hardening Phase 2")).toBeInTheDocument();
    // p3/p4 share p1's projectId (per the fixture), so they resolve too —
    // 3 rows for Bayou, 1 for Storm Hardening.
    expect(screen.getAllByText("Bayou District Rebuild")).toHaveLength(3);
  });

  it("shows a dash in the Project column for a row whose projectId has no entry in the map", () => {
    render(<PolesTable poles={[poles[0]]} projectNames={{ "some-other-project": "Unrelated" }} />);
    const row = screen.getByText("51079-1000").closest("tr") as HTMLElement;
    const cells = row.querySelectorAll("td");
    expect(cells[0]).toHaveTextContent("—"); // Project is the first column here
  });

  it("shows only the Project column (no Customer) when customerScoped is true, even with a customerName given", () => {
    render(
      <PolesTable
        poles={[poles[0]]}
        customerScoped
        customerName="Coastal Power & Light"
        projectNames={{ [poles[0].projectId]: "Bayou District Rebuild" }}
      />,
    );
    expect(screen.queryByRole("columnheader", { name: "Customer" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Project" })).toBeInTheDocument();
    expect(screen.queryByText("Coastal Power & Light")).not.toBeInTheDocument();
    expect(screen.getByText("Bayou District Rebuild")).toBeInTheDocument();
  });

  it("shows only the Project column (no Customer) when customerName is omitted, even without customerScoped", () => {
    render(
      <PolesTable
        poles={[poles[0]]}
        projectNames={{ [poles[0].projectId]: "Bayou District Rebuild" }}
      />,
    );
    expect(screen.queryByRole("columnheader", { name: "Customer" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Project" })).toBeInTheDocument();
  });

  it("shows neither column when only customerName is given without projectNames", () => {
    render(<PolesTable poles={poles} customerName="Coastal Power & Light" />);
    expect(screen.queryByRole("columnheader", { name: "Customer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Project" })).not.toBeInTheDocument();
  });

  it("does not render Last Update or Installed anywhere on the row", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.queryByText(/Last Update/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Installed/)).not.toBeInTheDocument();
  });

  it("filters by pole number as you type", async () => {
    const user = userEvent.setup();
    render(<PolesTable poles={poles} />);
    await user.type(screen.getByPlaceholderText("Search by pole number…"), "1001");

    expect(screen.queryByText("51079-1000")).not.toBeInTheDocument();
    expect(screen.getByText("51079-1001")).toBeInTheDocument();
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
    const many: PoleSummary[] = Array.from({ length: 25 }, (_, i) =>
      makePole({ id: `pole-id-${i + 1}`, poleNumber: `pole-${i + 1}` }),
    );
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
    const many: PoleSummary[] = Array.from({ length: 25 }, (_, i) =>
      makePole({ id: `pole-id-${i + 1}`, poleNumber: `pole-${i + 1}` }),
    );
    const user = userEvent.setup();
    render(<PolesTable poles={many} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("pole-11")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search by pole number…"), "pole-2");
    expect(screen.getByText("pole-2")).toBeInTheDocument();
  });
});
