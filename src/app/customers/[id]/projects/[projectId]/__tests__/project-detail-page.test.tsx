import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Customer, Project } from "@/lib/types";

const { getCustomerMock, getProjectsForCustomerMock } = vi.hoisted(() => ({
  getCustomerMock: vi.fn(),
  getProjectsForCustomerMock: vi.fn(),
}));

vi.mock("@/lib/apim", () => ({
  getCustomer: getCustomerMock,
  getProjectsForCustomer: getProjectsForCustomerMock,
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

const projects: Project[] = [
  {
    id: "p1",
    name: "Bayou District Rebuild",
    customerId: "r2",
    poleNumbers: ["51079-1000"],
    poleIds: ["rec1"],
    polesUnderContract: 4,
    effectiveDate: "2024-11-25",
    installDates: ["2025-05-23"],
    createdAt: "2024-12-13 12:02:12-05:00",
  },
  {
    id: "p2",
    name: "Storm Hardening Phase 2",
    customerId: "r2",
    poleNumbers: [],
    poleIds: [],
    polesUnderContract: 10,
    effectiveDate: "2025-01-15",
    installDates: [],
    createdAt: "2025-01-10 09:00:00-05:00",
  },
];

describe("ProjectDetailPage", () => {
  it("renders the project name as the heading", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Bayou District Rebuild" })).toBeInTheDocument();
  });

  it("renders the breadcrumb trail: Customers / Customer / Project", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const breadcrumb = within(screen.getByRole("navigation"));
    expect(breadcrumb.getByRole("link", { name: "\u2190 Customers" })).toHaveAttribute(
      "href",
      "/customers",
    );
    expect(breadcrumb.getByRole("link", { name: "Coastal Power & Light" })).toHaveAttribute(
      "href",
      "/customers/r2",
    );
  });

  it("does not repeat the project name in the breadcrumb — it's already the page heading", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const breadcrumb = within(screen.getByRole("navigation"));
    expect(breadcrumb.queryByText("Bayou District Rebuild")).not.toBeInTheDocument();
    // The heading still shows it, exactly once, outside the breadcrumb.
    expect(screen.getAllByText("Bayou District Rebuild")).toHaveLength(1);
  });

  it("carries the ?cust_q= search param into the breadcrumb links", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({ cust_q: "coastal" }),
    });
    render(jsx);

    const breadcrumb = within(screen.getByRole("navigation"));
    expect(
      breadcrumb.getByRole("link", { name: "\u2190 Customer Search: \u201ccoastal\u201d" }),
    ).toHaveAttribute("href", "/customers?cust_q=coastal");
    expect(breadcrumb.getByRole("link", { name: "Coastal Power & Light" })).toHaveAttribute(
      "href",
      "/customers/r2?cust_q=coastal",
    );
  });

  it("shows the customer name above the project name as plain text (not a link)", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    // Still appears in the breadcrumb as a link; the header copy is plain text.
    const breadcrumbLink = within(screen.getByRole("navigation")).getByRole("link", {
      name: "Coastal Power & Light",
    });
    expect(breadcrumbLink).toHaveAttribute("href", "/customers/r2");

    const customerTexts = screen.getAllByText("Coastal Power & Light");
    expect(customerTexts).toHaveLength(2);
    const headerCustomerText = customerTexts.find((el) => !el.closest("nav"));
    expect(headerCustomerText).toBeTruthy();
    expect(headerCustomerText!.tagName).not.toBe("A");
    expect(headerCustomerText!.closest("a")).toBeNull();

    const heading = screen.getByRole("heading", { name: "Bayou District Rebuild" });
    // The customer name sits before the heading in the DOM (above it).
    expect(
      headerCustomerText!.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("colors the header's customer name teal", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const headerCustomerText = screen
      .getAllByText("Coastal Power & Light")
      .find((el) => !el.closest("nav"));
    expect(headerCustomerText?.className).toContain("text-[var(--accent)]");
  });

  it("does not render the stub notice", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText(/stub detail page/i)).not.toBeInTheDocument();
  });

  it("does not render the customer/project-id info box", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText("Project ID")).not.toBeInTheDocument();
    expect(screen.queryByText("p1")).not.toBeInTheDocument();
  });

  it("shows a Light Status section with this project's total lights", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Light Status")).toBeInTheDocument();
    expect(screen.getByLabelText("4 Total lights")).toBeInTheDocument();
  });

  it("shows stub placeholders for Lights working and Total faults", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Lights working")).toBeInTheDocument();
    expect(screen.getByText("Total faults")).toBeInTheDocument();
  });

  it("renders a not-found state when the customer doesn't exist", async () => {
    getCustomerMock.mockResolvedValue(undefined);
    getProjectsForCustomerMock.mockResolvedValue([]);
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
    getProjectsForCustomerMock.mockResolvedValue(projects);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "does-not-exist" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Project not found" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Coastal Power & Light" }),
    ).toHaveAttribute("href", "/customers/r2");
    // The heading already says "not found" — the breadcrumb shouldn't repeat it.
    expect(within(screen.getByRole("navigation")).queryByText("Not found")).not.toBeInTheDocument();
  });
});
