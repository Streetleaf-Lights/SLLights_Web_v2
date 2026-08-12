import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatGroup } from "@/components/StatGroup";

describe("StatGroup", () => {
  const stats = [
    { value: 14, label: "Total lights" },
    { value: "—", label: "Lights working" },
    { value: "—", label: "Total faults" },
  ];

  it("renders every stat's value and label", () => {
    render(<StatGroup stats={stats} />);
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Total lights")).toBeInTheDocument();
    expect(screen.getByText("Lights working")).toBeInTheDocument();
    expect(screen.getByText("Total faults")).toBeInTheDocument();
  });

  it("sets an aria-label per stat combining value and label", () => {
    render(<StatGroup stats={stats} />);
    expect(screen.getByLabelText("14 Total lights")).toBeInTheDocument();
    expect(screen.getByLabelText("— Lights working")).toBeInTheDocument();
  });

  it("renders all stats inside a single shared box, not separate boxes", () => {
    render(<StatGroup stats={stats} />);
    const first = screen.getByLabelText("14 Total lights");
    const second = screen.getByLabelText("— Lights working");
    // Same immediate parent (the grid), and that grid's parent is the
    // single bordered box — i.e. one box divided into columns.
    expect(first.parentElement).toBe(second.parentElement);
    expect(first.parentElement?.className).toContain("grid");
    expect(first.parentElement?.parentElement?.className).toContain("rounded-lg");
  });

  it("uses the white surface background (matching the page header)", () => {
    render(<StatGroup stats={stats} />);
    const box = screen.getByLabelText("14 Total lights").parentElement?.parentElement;
    expect(box?.className).toContain("bg-[var(--surface)]");
  });

  it("defaults to the large size", () => {
    render(<StatGroup stats={stats} />);
    expect(screen.getByText("14").className).toContain("text-[20px]");
  });

  it("uses smaller styles when size='sm'", () => {
    render(<StatGroup stats={stats} size="sm" />);
    expect(screen.getByText("14").className).toContain("text-[13px]");
  });

  it("defaults the value color to ink when no valueClassName is given", () => {
    render(<StatGroup stats={stats} />);
    expect(screen.getByText("14").className).toContain("text-[var(--ink)]");
  });

  it("overrides the value color when valueClassName is given", () => {
    render(
      <StatGroup
        stats={[{ value: "92.5%", label: "Lights working", valueClassName: "text-[var(--status-active)]" }]}
      />,
    );
    const value = screen.getByText("92.5%");
    expect(value.className).toContain("text-[var(--status-active)]");
    expect(value.className).not.toContain("text-[var(--ink)]");
  });

  it("adapts the grid column count to the number of stats (e.g. 2 for battery voltages)", () => {
    const twoStats = [
      { value: "13.5V", label: "Battery Voltage 1" },
      { value: "13.8V", label: "Battery Voltage 2" },
    ];
    render(<StatGroup stats={twoStats} />);
    const grid = screen.getByLabelText("13.5V Battery Voltage 1").parentElement;
    expect(grid?.style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
  });

  it("uses 3 columns for the usual 3-stat case", () => {
    render(<StatGroup stats={stats} />);
    const grid = screen.getByLabelText("14 Total lights").parentElement;
    expect(grid?.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
  });
});
