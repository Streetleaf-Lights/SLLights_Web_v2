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
});
