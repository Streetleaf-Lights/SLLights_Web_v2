import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Customer, CustomerPoleVitals, Project } from "@/lib/types";

const { getCustomerMock, getProjectsForCustomerMock, getPoleVitalsForCustomerMock } = vi.hoisted(
  () => ({
    getCustomerMock: vi.fn(),
    getProjectsForCustomerMock: vi.fn(),
    getPoleVitalsForCustomerMock: vi.fn(),
  }),
);

vi.mock("@/lib/apim", () => ({
  getCustomer: getCustomerMock,
  getProjectsForCustomer: getProjectsForCustomerMock,
  getPoleVitalsForCustomer: getPoleVitalsForCustomerMock,
}));

// LocationMap (used directly here) loads the real Google Maps JS API
// otherwise — not appropriate for a page-level integration test, and the
// map's own internals are already covered by LocationMap.test.tsx.
vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(() => new Promise(() => {})),
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

const vitals: CustomerPoleVitals = {
  id: "r2",
  name: "Coastal Power & Light",
  totalLights: 88,
  connectedLights: 84,
  totalFaults: 2,
  percentWorking: 96.0,
  poles: [],
  projects: [
    {
      id: "p1",
      name: "Bayou District Rebuild",
      totalLights: 54,
      connectedLights: 51,
      totalFaults: 1,
      percentWorking: 92.5,
      poles: [
        { id: "pv1", poleNumber: "51079-1000", locationId: "loc-1", isOnline: true, lightStatus: "Working", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null },
        { id: "pv2", poleNumber: "51079-1001", locationId: "loc-2", isOnline: true, lightStatus: "Daylight", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null },
        { id: "pv3", poleNumber: "51079-1002", locationId: "loc-3", isOnline: false, lightStatus: "Fault", installDate: null, lat: null, long: null, lastUpdate: null, batteryVoltage1: null, batteryVoltage2: null, avgBatteryPercentage: null, avgPanelPercentage: null, avgLightPercentage: null },
      ],
    },
    {
      id: "p2",
      name: "Storm Hardening Phase 2",
      totalLights: 34,
      connectedLights: 34,
      totalFaults: 1,
      percentWorking: 100.0,
      poles: [],
    },
  ],
};

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-api-key");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", "test-map-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the project name as the heading", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
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
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
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
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
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

  it("carries pole_q into the Poles table's pole links", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({ pole_q: "12057" }),
    });
    render(jsx);

    expect(screen.getByRole("link", { name: "51079-1000" })).toHaveAttribute(
      "href",
      "/customers/r2/projects/p1/poles/pv1?pole_q=12057",
    );
  });

  it("restores the search in the top-level Customers breadcrumb, and the customer crumb still carries it too", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
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

  it("shows the Poles breadcrumb (not Customers) when arriving via a pole search, restores it, and carries pole_q into the customer crumb", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({ pole_q: "12057" }),
    });
    render(jsx);

    const breadcrumb = within(screen.getByRole("navigation"));
    expect(
      breadcrumb.getByRole("link", { name: "\u2190 Pole Search: \u201c12057\u201d" }),
    ).toHaveAttribute("href", "/poles?pole_q=12057");
    expect(breadcrumb.queryByText(/Customer Search/)).not.toBeInTheDocument();
    expect(breadcrumb.getByRole("link", { name: "Coastal Power & Light" })).toHaveAttribute(
      "href",
      "/customers/r2?pole_q=12057",
    );
  });

  it("shows the customer name above the project name as plain text (not a link)", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
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
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
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
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
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
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText("Project ID")).not.toBeInTheDocument();
    expect(screen.queryByText("p1")).not.toBeInTheDocument();
  });

  it("shows a Light Status section with this project's real vitals", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    // Now that the Poles table no longer has a "Working" column, "Light
    // Status" only appears once, as this section's heading.
    expect(screen.getByText("Light Status")).toBeInTheDocument();
    expect(screen.getByLabelText("54 Total lights")).toBeInTheDocument();
    expect(screen.getByLabelText("51 Connected lights")).toBeInTheDocument();
    expect(screen.getByLabelText("1 Total faults")).toBeInTheDocument();
  });

  it("shows a different project's own vitals when viewing that project", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByLabelText("34 Total lights")).toBeInTheDocument();
    expect(screen.getByLabelText("34 Connected lights")).toBeInTheDocument();
    expect(screen.getByLabelText("1 Total faults")).toBeInTheDocument();
  });

  it("shows a Poles section listing this project's poles", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Poles")).toBeInTheDocument();
    expect(screen.getByText("51079-1000")).toBeInTheDocument();
    expect(screen.getByText("51079-1002")).toBeInTheDocument();
  });

  it("shows the Poles empty state for a project with no poles", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("No poles on file for this project yet.")).toBeInTheDocument();
  });

  it("shows the Poles empty state when there are no vitals for this project at all", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({ ...vitals, projects: [] });
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("No poles on file for this project yet.")).toBeInTheDocument();
  });

  it("shows dashes when no vitals are available for this project", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({ ...vitals, projects: [] });
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByLabelText("— Total lights")).toBeInTheDocument();
    expect(screen.getByLabelText("— Connected lights")).toBeInTheDocument();
    expect(screen.getByLabelText("— Total faults")).toBeInTheDocument();
  });

  it("renders a not-found state when the customer doesn't exist", async () => {
    getCustomerMock.mockResolvedValue(undefined);
    getProjectsForCustomerMock.mockResolvedValue([]);
    getPoleVitalsForCustomerMock.mockResolvedValue(undefined);
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
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
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

  it("shows a Location section with a map container when the project's poles have coordinates", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({
      ...vitals,
      projects: [
        {
          ...vitals.projects[0],
          poles: [
            { ...vitals.projects[0].poles[0], lat: 29.9511, long: -90.0715 },
            { ...vitals.projects[0].poles[1], lat: 29.9611, long: -90.0815 },
          ],
        },
        vitals.projects[1],
      ],
    });
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByRole("application", { name: "Map" })).toBeInTheDocument();
  });

  it("excludes poles with undefined (not just null) coordinates from the map, without crashing", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({
      ...vitals,
      projects: [
        {
          ...vitals.projects[0],
          poles: [
            { ...vitals.projects[0].poles[0], lat: 29.9511, long: -90.0715 },
            { ...vitals.projects[0].poles[1], lat: undefined, long: undefined },
          ],
        },
        vitals.projects[1],
      ],
    });
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("application", { name: "Map" })).toBeInTheDocument();
  });

  it("places the Location section above the Poles section", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const locationHeading = screen.getByText("Location");
    const polesHeading = screen.getByText("Poles");
    expect(
      locationHeading.compareDocumentPosition(polesHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows an empty-location message instead of a map when none of the project's poles have coordinates", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(
      screen.getByText("No poles have location data for this project."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("application", { name: "Map" })).not.toBeInTheDocument();
  });

  it("shows an empty-location message when the project has no poles at all", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await ProjectDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p2" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(
      screen.getByText("No poles have location data for this project."),
    ).toBeInTheDocument();
  });
});
