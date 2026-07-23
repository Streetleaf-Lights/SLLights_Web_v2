import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PolesTable } from "@/components/PolesTable";
import type { Pole } from "@/lib/types";

describe("PolesTable", () => {
  const poles: Pole[] = [
    {
      id: "pole-1",
      assetTag: "CPL-A-00931",
      customerId: "cust-001",
      customerName: "Coastal Power & Light",
      projectId: "proj-101",
      projectName: "Bayou District Rebuild",
      status: "active",
      material: "Wood, Southern Pine",
      heightFt: 40,
      latitude: 29.9511,
      longitude: -90.0715,
      lastInspected: "2026-06-02",
    },
    {
      id: "pole-2",
      assetTag: "CPL-B-01204",
      customerId: "cust-001",
      customerName: "Coastal Power & Light",
      projectId: "proj-102",
      projectName: "Storm Hardening Phase 2",
      status: "planned",
      material: "Steel",
      heightFt: 45,
      latitude: 30.0687,
      longitude: -89.9308,
      lastInspected: "—",
    },
  ];

  it("renders a row per pole with asset tag, customer, and project", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByText("CPL-A-00931")).toBeInTheDocument();
    expect(screen.getAllByText("Coastal Power & Light")).toHaveLength(2);
    expect(screen.getByText("Bayou District Rebuild")).toBeInTheDocument();
  });

  it("renders the status badge for each pole", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("formats height with a ft suffix", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByText("40 ft")).toBeInTheDocument();
  });

  it("formats coordinates to 4 decimal places", () => {
    render(<PolesTable poles={poles} />);
    expect(screen.getByText("29.9511, -90.0715")).toBeInTheDocument();
  });

  it("renders only the header row for an empty list", () => {
    render(<PolesTable poles={[]} />);
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});
