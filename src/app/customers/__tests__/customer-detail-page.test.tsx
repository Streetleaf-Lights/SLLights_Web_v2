import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Customer } from "@/lib/types";

const { getCustomerMock } = vi.hoisted(() => ({ getCustomerMock: vi.fn() }));

vi.mock("@/lib/apim", () => ({
  getCustomer: getCustomerMock,
}));

import CustomerDetailPage from "@/app/customers/[id]/page";

const customer: Customer = {
  id: "r2",
  name: "Coastal Power & Light",
  projects: [
    { id: "p1", name: "Bayou District Rebuild" },
    { id: "p2", name: "Storm Hardening Phase 2" },
  ],
  address: "412 Harbor Ave",
  city: "New Orleans",
  state: "LA",
  zip: "70115",
  phone: "504-555-0132",
  createdAt: "2026-02-11 14:20:05-05:00",
};

describe("CustomerDetailPage", () => {
  it("renders the customer name as the heading", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Coastal Power & Light" })).toBeInTheDocument();
  });

  it("renders location, phone, address, and id fields", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("New Orleans, LA")).toBeInTheDocument();
    expect(screen.getByText("504-555-0132")).toBeInTheDocument();
    expect(screen.getByText("412 Harbor Ave")).toBeInTheDocument();
    expect(screen.getByText("r2")).toBeInTheDocument();
  });

  it("links each project to its detail page", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("link", { name: /Bayou District Rebuild/ })).toHaveAttribute(
      "href",
      "/customers/r2/projects/p1",
    );
  });

  it("carries the ?q= search param into the breadcrumb and project links", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({ q: "coastal" }),
    });
    render(jsx);

    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute(
      "href",
      "/customers?q=coastal",
    );
    expect(screen.getByRole("link", { name: /Bayou District Rebuild/ })).toHaveAttribute(
      "href",
      "/customers/r2/projects/p1?q=coastal",
    );
  });

  it("shows a message when the customer has no projects", async () => {
    getCustomerMock.mockResolvedValue({ ...customer, projects: [] });
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("No projects on file for this customer yet.")).toBeInTheDocument();
  });

  it("renders a not-found state when the customer doesn't exist", async () => {
    getCustomerMock.mockResolvedValue(undefined);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "does-not-exist" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Customer not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Customers" })).toHaveAttribute(
      "href",
      "/customers",
    );
  });
});
