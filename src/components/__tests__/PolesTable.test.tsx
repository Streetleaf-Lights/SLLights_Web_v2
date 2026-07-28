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
      lightStatus: "DayLight",
      isOnline: true,
      avgBatteryPercentage: 80.06,
      avgPanelPercentage: 19.32,
      avgLightPercentage: 0.0,
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
      lightStatus: null,
      isOnline: false,
      avgBatteryPercentage: null,
      avgPanelPercentage: null,
      avgLightPercentage: null,
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
    expect(row1.getByText("27.7414, -82.4051")).toBeInTheDocument();
  });

  it("shows red Offline and dashed coordinates for a pole with no location", () => {
    render(<PolesTable poles={poles} />);
    const rows = screen.getAllByRole("row");
    const row2 = within(rows[2]);
    expect(row2.getByText("Offline").className).toContain("text-[var(--status-flagged)]");
    expect(row2.getByText("—, —")).toBeInTheDocument();
  });

  it("does not render a Customer/Project column", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.queryByText(/Customer:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Project:/)).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Customer/ })).not.toBeInTheDocument();
  });

  it("System Status is a single boxed group with Panel, Battery, and Light Status", () => {
    render(<PolesTable poles={poles} />);
    const panel = screen.getByLabelText("19.3% Panel Status");
    const battery = screen.getByLabelText("80.1% Battery Status");
    const light = screen.getByLabelText("0% Light Status");
    // All three share the same box (grandparent), confirming it's one group, not 3 separate boxes.
    expect(panel.parentElement).toBe(battery.parentElement);
    expect(panel.parentElement).toBe(light.parentElement);
    expect(panel.parentElement?.parentElement?.className).toContain("rounded-lg");
  });

  it("colors Panel/Battery Status using the tiered thresholds", () => {
    render(<PolesTable poles={poles} />);
    const panel = screen.getByLabelText("19.3% Panel Status"); // < 50 -> red
    const battery = screen.getByLabelText("80.1% Battery Status"); // >= 80 -> green
    expect(panel.querySelector("div")?.className).toContain("text-[var(--status-flagged)]");
    expect(battery.querySelector("div")?.className).toContain("text-[var(--status-active)]");
  });

  it("colors Light Status by the lightStatus field, not its own percentage", () => {
    render(<PolesTable poles={poles} />);
    // avgLightPercentage is 0.0 (low, daytime) but lightStatus is "DayLight" -> green
    const light = screen.getByLabelText("0% Light Status");
    expect(light.querySelector("div")?.className).toContain("text-[var(--status-active)]");
  });

  it("shows dashes in System Status for a pole with no telemetry", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByLabelText("— Panel Status")).toBeInTheDocument();
    expect(screen.getByLabelText("— Battery Status")).toBeInTheDocument();
    expect(screen.getByLabelText("— Light Status")).toBeInTheDocument();
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
      lightStatus: null,
      isOnline: null,
      avgBatteryPercentage: null,
      avgPanelPercentage: null,
      avgLightPercentage: null,
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
      lightStatus: null,
      isOnline: null,
      avgBatteryPercentage: null,
      avgPanelPercentage: null,
      avgLightPercentage: null,
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
