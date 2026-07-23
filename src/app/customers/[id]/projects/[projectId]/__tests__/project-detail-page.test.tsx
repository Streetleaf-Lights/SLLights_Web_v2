import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Customer } from "@/lib/types";

const { getCustomerMock } = vi.hoisted(() => ({ getCustomerMock: vi.fn() }));

vi.mock("@/lib/apim", () => ({
  getCustomer: getCustomerMock,
}));

import ProjectDetailPage from "@/app/customers/[id]/projects/[projectId]/page";

const customer: Customer = {
  id: "r2",
  name: "Coastal Power & Light",
  projects: [
    { id: "p1", name: "Bayou District Rebuild" },
    { id: "p2", name: "Storm Hardening Phase 2" },
  ],
  address: null,
  city: "New Orleans",
  state: "LA",
  zip: null,
  phone: "504-555-0132",
  createdAt: "2026-02-11 14:20:05-05:00",
};

describe("ProjectDetailPage", () => {
  it("renders the project name as the heading", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Bayou District Rebuild" })).toBeInTheDocument();
  });

  it("renders the breadcrumb trail: Customers / Customer / Project", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const breadcrumb = within(screen.getByRole("navigation"));
    expect(breadcrumb.getByRole("link", { name: "Customers" })).toHaveAttribute(
      "href",
      "/customers",
    );
    expect(breadcrumb.getByRole("link", { name: "Coastal Power & Light" })).toHaveAttribute(
      "href",
      "/customers/r2",
    );
  });

  it("carries the ?q= search param into the breadcrumb links", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({ q: "coastal" }),
    });
    render(jsx);

    const breadcrumb = within(screen.getByRole("navigation"));
    expect(breadcrumb.getByRole("link", { name: "Customers" })).toHaveAttribute(
      "href",
      "/customers?q=coastal",
    );
    expect(breadcrumb.getByRole("link", { name: "Coastal Power & Light" })).toHaveAttribute(
      "href",
      "/customers/r2?q=coastal",
    );
  });

  it("renders a not-found state when the customer doesn't exist", async () => {
    getCustomerMock.mockResolvedValue(undefined);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "does-not-exist", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Project not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Customers" })).toHaveAttribute(
      "href",
      "/customers",
    );
  });

  it("renders a not-found state when the project id doesn't match", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "does-not-exist" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Project not found" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Coastal Power & Light" }),
    ).toHaveAttribute("href", "/customers/r2");
  });
});
