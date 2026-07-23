import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

  it("does not repeat the customer name in the breadcrumb — it's already the page heading", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(
      within(screen.getByRole("navigation")).queryByText("Coastal Power & Light"),
    ).not.toBeInTheDocument();
    // The heading still shows it, exactly once, outside the breadcrumb.
    expect(screen.getAllByText("Coastal Power & Light")).toHaveLength(1);
  });

  it("renders the initials avatar in the header", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("CP")).toBeInTheDocument();
  });

  it("renders the combined address line below the customer name", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(
      screen.getByText("412 Harbor Ave, New Orleans, LA 70115"),
    ).toBeInTheDocument();
  });

  it("omits the address line entirely when no address fields are set", async () => {
    getCustomerMock.mockResolvedValue({
      ...customer,
      address: null,
      city: null,
      state: null,
      zip: null,
    });
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText(/Harbor Ave/)).not.toBeInTheDocument();
  });

  it("shows the project count in the header", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByLabelText("2 projects")).toBeInTheDocument();
  });

  it("uses the singular 'Project' label when there is exactly one", async () => {
    getCustomerMock.mockResolvedValue({
      ...customer,
      projects: [{ id: "p1", name: "Bayou District Rebuild" }],
    });
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByLabelText("1 project")).toBeInTheDocument();
  });

  it("renders the phone number in the header", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("504-555-0132")).toBeInTheDocument();
  });

  it("omits the phone line when there is no phone on file", async () => {
    getCustomerMock.mockResolvedValue({ ...customer, phone: null });
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText("504-555-0132")).not.toBeInTheDocument();
  });

  it("does not render the stub notice or the customer id anywhere", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText(/This is a stub detail page/)).not.toBeInTheDocument();
    expect(screen.queryByText("r2")).not.toBeInTheDocument();
  });

  it("shows the Projects section heading outside any bordered box", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    // "Projects" appears twice: the header's boxed project-count stat, and
    // the section heading above the list — only the latter should be free
    // of any bordered container.
    const projectsLabels = screen.getAllByText("Projects");
    expect(projectsLabels).toHaveLength(2);
    const sectionHeading = projectsLabels.find((el) => el.className.includes("mb-3"));
    expect(sectionHeading).toBeTruthy();
    expect(sectionHeading?.closest(".rounded-lg")).toBeNull();
  });

  it("does not wrap the project list itself in a bordered box", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const projectLink = screen.getByRole("link", { name: /Bayou District Rebuild/ });
    // Each row has its own small border, but there should be no enclosing
    // rounded-lg box wrapping the whole stacked list.
    expect(projectLink.parentElement?.className).not.toContain("rounded-lg");
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

  it("carries the ?cust_q= search param into the breadcrumb and project links", async () => {
    getCustomerMock.mockResolvedValue(customer);
    const jsx = await CustomerDetailPage({
      params: Promise.resolve({ id: "r2" }),
      searchParams: Promise.resolve({ cust_q: "coastal" }),
    });
    render(jsx);

    expect(
      screen.getByRole("link", { name: "\u2190 Customer Search: \u201ccoastal\u201d" }),
    ).toHaveAttribute("href", "/customers?cust_q=coastal");
    expect(screen.getByRole("link", { name: /Bayou District Rebuild/ })).toHaveAttribute(
      "href",
      "/customers/r2/projects/p1?cust_q=coastal",
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
    // The heading already says "not found" — the breadcrumb shouldn't repeat it.
    expect(within(screen.getByRole("navigation")).queryByText("Not found")).not.toBeInTheDocument();
  });
});
