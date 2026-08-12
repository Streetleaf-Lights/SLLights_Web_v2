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

// LocationMap (used by PoleMap) loads the real Google Maps JS API otherwise —
// not appropriate for a page-level integration test, and the map's own
// internals are already covered by LocationMap.test.tsx.
vi.mock("@googlemaps/js-api-loader", () => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(() => new Promise(() => {})),
}));

// PoleVitalsChart fetches from /api/getpolevitalsbyperiod on mount — not
// appropriate for this page-level test, and its internals get their own
// dedicated test file (PoleVitalsChart.test.tsx).
vi.mock("@/components/PoleVitalsChart", () => ({
  PoleVitalsChart: () => null,
}));

import PoleDetailPage from "@/app/customers/[id]/projects/[projectId]/poles/[poleId]/page";

const customer: Customer = {
  id: "r2",
  name: "Coastal Power & Light",
  projects: [{ id: "p1", name: "Bayou District Rebuild" }],
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
    poleNumbers: [],
    poleIds: [],
    polesUnderContract: 1,
    effectiveDate: "2024-11-25",
    installDates: [],
    createdAt: "2024-12-13 12:02:12-05:00",
  },
];

const vitals: CustomerPoleVitals = {
  id: "r2",
  name: "Coastal Power & Light",
  totalLights: 1,
  connectedLights: 1,
  totalFaults: 0,
  percentWorking: 100,
  poles: [],
  projects: [
    {
      id: "p1",
      name: "Bayou District Rebuild",
      totalLights: 1,
      connectedLights: 1,
      totalFaults: 0,
      percentWorking: 100,
      poles: [
        {
          id: "pole1",
          poleNumber: "PAS-4938",
          locationId: "loc-1",
          isOnline: true,
          lightStatus: "DayLight",
          installDate: "2025-08-28",
          lat: 28.3031566,
          long: -82.2750467,
          lastUpdate: "2026-07-26 13:25:41+00:00",
          batteryVoltage1: 13.509,
          batteryVoltage2: 13.785,
          avgBatteryPercentage: 90.43,
          avgPanelPercentage: 10.79,
          avgLightPercentage: 11.3,
        },
      ],
    },
  ],
};

describe("PoleDetailPage", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-api-key");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", "test-map-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the pole number as the heading", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "PAS-4938" })).toBeInTheDocument();
  });

  it("shows the project name above the pole number", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const projectName = screen
      .getAllByText("Bayou District Rebuild")
      .find((el) => !el.closest("nav"));
    expect(projectName).toBeTruthy();
    expect(projectName?.className).toContain("text-[var(--accent)]");
  });

  it("renders the breadcrumb trail: Customers / Customer / Project", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
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
    expect(breadcrumb.getByRole("link", { name: "Bayou District Rebuild" })).toHaveAttribute(
      "href",
      "/customers/r2/projects/p1",
    );
  });

  it("restores the search in the top-level Customers breadcrumb, and customer/project crumbs still carry it too", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
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
    expect(breadcrumb.getByRole("link", { name: "Bayou District Rebuild" })).toHaveAttribute(
      "href",
      "/customers/r2/projects/p1?cust_q=coastal",
    );
  });

  it("shows the Poles breadcrumb (not Customers) when arriving via a pole search, restores it, and carries pole_q into customer/project crumbs", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
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
    expect(breadcrumb.getByRole("link", { name: "Bayou District Rebuild" })).toHaveAttribute(
      "href",
      "/customers/r2/projects/p1?pole_q=12057",
    );
  });

  it("shows Last Update, Install Date, Lat, Long, and online status in the header", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("2026-07-26 13:25:41")).toBeInTheDocument(); // lastUpdate, tz stripped
    expect(screen.getByText("2025-08-28")).toBeInTheDocument(); // installDate
    expect(screen.getByText("28.3031566")).toBeInTheDocument(); // lat, full precision, not rounded
    expect(screen.getByText("-82.2750467")).toBeInTheDocument(); // long, full precision, not rounded
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("does not crash and shows dashes when lat/long/battery voltage are undefined (not just null)", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({
      ...vitals,
      projects: [
        {
          ...vitals.projects[0],
          poles: [
            {
              ...vitals.projects[0].poles[0],
              lat: undefined,
              long: undefined,
              batteryVoltage1: undefined,
              batteryVoltage2: undefined,
            },
          ],
        },
      ],
    });
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Lat:").parentElement).toHaveTextContent("Lat: —");
    expect(screen.getByText("Long:").parentElement).toHaveTextContent("Long: —");
    expect(screen.getByLabelText("— Battery Voltage 1")).toBeInTheDocument();
    expect(screen.getByLabelText("— Battery Voltage 2")).toBeInTheDocument();
  });

  it("shows a System Status section with Panel/Battery/Light Status percentages", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("System Status")).toBeInTheDocument();
    expect(screen.getByLabelText("10.8% Panel Status")).toBeInTheDocument();
    expect(screen.getByLabelText("90.4% Battery Status")).toBeInTheDocument();
    expect(screen.getByLabelText("11.3% Light Status")).toBeInTheDocument();
  });

  it("shows a Battery Status section with both battery voltages", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByLabelText("13.509V Battery Voltage 1")).toBeInTheDocument();
    expect(screen.getByLabelText("13.785V Battery Voltage 2")).toBeInTheDocument();
  });

  it("shows a Location section with a map container when the pole has coordinates", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByRole("application", { name: "Map" })).toBeInTheDocument();
  });

  it("shows a Vitals History section", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Vitals History")).toBeInTheDocument();
  });

  it("places the Vitals History section above the Location section", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const vitalsHeading = screen.getByText("Vitals History");
    const locationHeading = screen.getByText("Location");
    expect(
      vitalsHeading.compareDocumentPosition(locationHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows a no-location fallback instead of a map when the pole has no coordinates", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({
      ...vitals,
      projects: [
        {
          ...vitals.projects[0],
          poles: [
            {
              id: "pole1",
              poleNumber: "PAS-4938",
              locationId: "loc-1",
              isOnline: null,
              lightStatus: null,
              installDate: null,
              lat: null,
              long: null,
              lastUpdate: null,
              batteryVoltage1: null,
              batteryVoltage2: null,
              avgBatteryPercentage: null,
              avgPanelPercentage: null,
              avgLightPercentage: null,
            },
          ],
        },
      ],
    });
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("No location on file for this pole.")).toBeInTheDocument();
    expect(screen.queryByRole("application", { name: "Map" })).not.toBeInTheDocument();
  });

  it("shows dashes for header fields and stat sections when a pole has no telemetry", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({
      ...vitals,
      projects: [
        {
          ...vitals.projects[0],
          poles: [
            {
              id: "pole1",
              poleNumber: "PAS-4938",
              locationId: "loc-1",
              isOnline: null,
              lightStatus: null,
              installDate: null,
              lat: null,
              long: null,
              lastUpdate: null,
              batteryVoltage1: null,
              batteryVoltage2: null,
              avgBatteryPercentage: null,
              avgPanelPercentage: null,
              avgLightPercentage: null,
            },
          ],
        },
      ],
    });
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByLabelText("— Panel Status")).toBeInTheDocument();
    expect(screen.getByLabelText("— Battery Status")).toBeInTheDocument();
    expect(screen.getByLabelText("— Light Status")).toBeInTheDocument();
    expect(screen.getByLabelText("— Battery Voltage 1")).toBeInTheDocument();
    expect(screen.getByLabelText("— Battery Voltage 2")).toBeInTheDocument();
  });

  it("groups Last Update + Install Date in one column, Lat + Long in another, and Online on its own", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const lastUpdateLine = screen.getByText("Last Update:").parentElement;
    const installDateLine = screen.getByText("Install Date:").parentElement;
    const latLine = screen.getByText("Lat:").parentElement;
    const longLine = screen.getByText("Long:").parentElement;
    const onlineEl = screen.getByText("Online");

    // Last Update and Install Date share the same column (parent).
    expect(lastUpdateLine?.parentElement).toBe(installDateLine?.parentElement);
    // Lat and Long share a different column from Last Update/Install Date.
    expect(latLine?.parentElement).toBe(longLine?.parentElement);
    expect(latLine?.parentElement).not.toBe(lastUpdateLine?.parentElement);
    // Online sits in its own column, separate from both date and coordinate groups.
    expect(onlineEl.closest("div")?.parentElement).not.toBe(lastUpdateLine?.parentElement);
    expect(onlineEl.closest("div")?.parentElement).not.toBe(latLine?.parentElement);
  });

  it("does not color-code Panel/Battery/Light Status values (System Status is neutral now)", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const panel = screen.getByLabelText("10.8% Panel Status");
    const battery = screen.getByLabelText("90.4% Battery Status");
    const light = screen.getByLabelText("11.3% Light Status");
    for (const stat of [panel, battery, light]) {
      const valueClass = stat.querySelector("div")?.className ?? "";
      expect(valueClass).not.toContain("text-[var(--status-active)]");
      expect(valueClass).not.toContain("text-[var(--status-flagged)]");
      expect(valueClass).not.toContain("text-[var(--status-warning)]");
    }
  });

  it("renders a not-found state when the customer doesn't exist", async () => {
    getCustomerMock.mockResolvedValue(undefined);
    getProjectsForCustomerMock.mockResolvedValue([]);
    getPoleVitalsForCustomerMock.mockResolvedValue(undefined);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "does-not-exist", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Pole not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Customers" })).toHaveAttribute(
      "href",
      "/customers",
    );
  });

  it("renders a not-found state when the project doesn't exist", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue([]);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "does-not-exist", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Pole not found" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Coastal Power & Light" }),
    ).toHaveAttribute("href", "/customers/r2");
  });

  it("renders a not-found state when the pole id doesn't match", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "does-not-exist" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByRole("heading", { name: "Pole not found" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to Bayou District Rebuild" }),
    ).toHaveAttribute("href", "/customers/r2/projects/p1");
  });
});
