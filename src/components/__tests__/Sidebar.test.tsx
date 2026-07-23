import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

import Sidebar from "@/components/Sidebar";

describe("Sidebar", () => {
  it("renders all three nav items", () => {
    usePathnameMock.mockReturnValue("/customers");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Customers/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Poles/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Users/ })).toBeInTheDocument();
  });

  it("links to the right hrefs", () => {
    usePathnameMock.mockReturnValue("/customers");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Customers/ })).toHaveAttribute(
      "href",
      "/customers",
    );
    expect(screen.getByRole("link", { name: /Poles/ })).toHaveAttribute("href", "/poles");
    expect(screen.getByRole("link", { name: /Users/ })).toHaveAttribute("href", "/users");
  });

  it("treats nested customer detail routes as within the Customers section", () => {
    usePathnameMock.mockReturnValue("/customers/rec123/projects/p1");
    render(<Sidebar />);
    // The active item gets the accent-colored indicator bar; we assert via
    // the active text color class rather than reaching into internals.
    const customersLabel = screen.getByText("Customers");
    expect(customersLabel.className).toContain("text-[var(--sidebar-accent-ink)]");
  });

  it("does not mark Poles/Users active while on a Customers route", () => {
    usePathnameMock.mockReturnValue("/customers");
    render(<Sidebar />);
    const polesLabel = screen.getByText("Poles");
    const usersLabel = screen.getByText("Users");
    expect(polesLabel.className).toContain("text-[var(--sidebar-accent-strong)]");
    expect(usersLabel.className).toContain("text-[var(--sidebar-accent-strong)]");
    // Neither should get the darker active-only ink color.
    expect(polesLabel.className).not.toContain("text-[var(--sidebar-accent-ink)]");
    expect(usersLabel.className).not.toContain("text-[var(--sidebar-accent-ink)]");
  });
});
