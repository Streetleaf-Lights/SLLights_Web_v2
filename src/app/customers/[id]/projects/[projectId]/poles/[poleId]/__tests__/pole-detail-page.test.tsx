import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Customer, CustomerPoleVitals, Project } from "@/lib/types";

/**
 * A timestamp within the last 48h, formatted like the API's own
 * (space-separated, explicit offset). isSilentPole compares lastUpdate
 * against the real current time, so a hardcoded past date would drift
 * into "silent" territory (and start failing these "normal" tests) the
 * further away the actual test-run date gets from when it was written.
 */
function recentTimestamp(hoursAgo = 1): string {
  const iso = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  return iso.replace("T", " ").replace(/\.\d{3}Z$/, "+00:00");
}

const RECENT_LAST_UPDATE = recentTimestamp(1);
const RECENT_LAST_UPDATE_DISPLAY = RECENT_LAST_UPDATE.replace("+00:00", "");

const { getCustomerMock, getProjectsForCustomerMock, getPoleVitalsForCustomerMock, getSessionUserMock } =
  vi.hoisted(() => ({
    getCustomerMock: vi.fn(),
    getProjectsForCustomerMock: vi.fn(),
    getPoleVitalsForCustomerMock: vi.fn(),
    getSessionUserMock: vi.fn(),
  }));

vi.mock("@/lib/apim", () => ({
  getCustomer: getCustomerMock,
  getProjectsForCustomer: getProjectsForCustomerMock,
  getPoleVitalsForCustomer: getPoleVitalsForCustomerMock,
}));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getSessionUser: getSessionUserMock,
  };
});

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
          lastUpdate: RECENT_LAST_UPDATE,
          batteryVoltage1: 13.509,
          batteryVoltage2: 13.785,
          lampPower1: 45,
          lampPower2: 46,
          batteryElecCurrent1: 90,
          batteryElecCurrent2: 100,
          solarBoardVoltage: 18.565,
          solarBoardElecCurrent: 4.443,
          avgBatteryPercentage: 90.43,
          avgPanelPercentage: 10.79,
          avgLightPercentage: 11.3,
          lightStatusLabel: "OK",
          panelStatusLabel: "OK",
          panelIdleReason: "OK",
          batteryStatusLabel: "OK",
          electricCurrentAverage: 0,
          isLedFault: false,
          isBatteryFault: false,
          isPanelFault: false,
          isOpenIssueFault: false,
          isPoleFault: false,
        },
      ],
    },
  ],
};

describe("PoleDetailPage", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-api-key");
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID", "test-map-id");
    getSessionUserMock.mockReset();
    getSessionUserMock.mockResolvedValue({ id: "u1", role: "Streetleaf Admin", customerId: null });
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

  it("shows Last Update, Install Date, Lat, Long, Connected, and Overall Status in the header", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText(RECENT_LAST_UPDATE_DISPLAY)).toBeInTheDocument(); // lastUpdate, tz stripped
    expect(screen.getByText("2025-08-28")).toBeInTheDocument(); // installDate
    expect(screen.getByText("28.3031566")).toBeInTheDocument(); // lat, full precision, not rounded
    expect(screen.getByText("-82.2750467")).toBeInTheDocument(); // long, full precision, not rounded
    expect(screen.queryByText("48h Connected:")).not.toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("48h Overall Status:").parentElement).toHaveTextContent(
      "48h Overall Status: OK",
    );
  });

  it("shows Disconnected for 48h Connected when isOnline is null but the pole has reported before (lastUpdate present)", async () => {
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
              isOnline: null,
              lastUpdate: "2026-07-26 13:25:41+00:00",
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

    const connectedText = screen.getByText("Disconnected");
    expect(connectedText.className).toContain("text-[var(--status-flagged)]");
  });

  it("shows Unknown for 48h Connected when isOnline is null and the pole has never reported (lastUpdate also null)", async () => {
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
              isOnline: null,
              lastUpdate: null,
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

    const connectedText = screen.getByText("Unknown");
    expect(connectedText.className).toContain("text-[var(--ink-faint)]");
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
  });

  it("shows a Statuses section with Light/Panel/Battery/Issue boxes, all OK/No Issue (green) with correct metrics when no faults are flagged", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Statuses")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Panel")).toBeInTheDocument();
    expect(screen.getByText("Battery")).toBeInTheDocument();
    expect(screen.getByText("Issue Entry")).toBeInTheDocument();

    // The 3 green box status badges (Light/Panel/Battery), scoped by their
    // badge styling (font-semibold) — the header's own Overall Status span
    // isn't font-semibold, and the metric values below happen to read "OK"
    // too in this fixture, so a plain text match would over-count.
    const okBadges = screen.getAllByText("OK").filter((el) => el.className.includes("font-semibold"));
    expect(okBadges).toHaveLength(3);
    for (const stat of okBadges) {
      expect(stat.className).toContain("text-[var(--status-active)]");
    }
    const noIssue = screen.getByText("None");
    expect(noIssue.className).toContain("text-[var(--status-active)]");
    expect(screen.getByText("48h Overall Status:").parentElement).toHaveTextContent(
      "48h Overall Status: OK",
    );
    expect(
      screen.getByText("48h Overall Status:").parentElement?.querySelector("span:last-child")
        ?.className,
    ).toContain("text-[var(--status-active)]");

    const operatingStatuses = screen.getAllByText("Operating Status");
    expect(operatingStatuses).toHaveLength(3);
    for (const label of operatingStatuses) {
      expect(label.nextElementSibling).toHaveTextContent("OK");
    }
    expect(screen.getByText("Battery Percentage").nextElementSibling).toHaveTextContent("0");
    expect(screen.queryByText("Electric Current")).not.toBeInTheDocument();

    // Battery Percentage sits just above Electric Current 1 & 2.
    const avgElecCurrentRow = screen.getByText("Battery Percentage").closest("div");
    const elecCurrent1Row = screen.getByText("Electric Current 1").closest("div");
    expect(avgElecCurrentRow?.nextElementSibling).toBe(elecCurrent1Row);
  });

  it("keeps 'Last Known' only on section headings for a silent pole (lastUpdate more than 48h ago) — the header's Overall Status label and box metric labels are no longer prefixed at all, while the underlying values are unaffected", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({
      ...vitals,
      projects: [
        {
          ...vitals.projects[0],
          poles: [{ ...vitals.projects[0].poles[0], lastUpdate: recentTimestamp(72) }],
        },
      ],
    });
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    // Header — no prefix regardless of silence.
    expect(screen.getByText("48h Overall Status:").parentElement).toHaveTextContent(
      "48h Overall Status: OK",
    );
    expect(screen.queryByText("Last Known 48h Overall Status:")).not.toBeInTheDocument();

    // Section heading (box titles Light/Panel/Battery/Issue stay the same)
    // still carries the prefix — that's a section-level indicator, unaffected.
    expect(screen.getByText("Last Known Statuses")).toBeInTheDocument();
    expect(screen.queryByText("Statuses")).not.toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Panel")).toBeInTheDocument();
    expect(screen.getByText("Battery")).toBeInTheDocument();
    expect(screen.getByText("Issue Entry")).toBeInTheDocument();

    // Box metric labels are plain — no prefix at all, silent or not — the
    // underlying values are unaffected by silence.
    const operatingStatuses = screen.getAllByText("Operating Status");
    expect(operatingStatuses).toHaveLength(3);
    for (const label of operatingStatuses) {
      expect(label.nextElementSibling).toHaveTextContent("OK");
    }
    expect(screen.getByText("Battery Percentage").nextElementSibling).toHaveTextContent("0");
    expect(screen.queryByText("Last Known Operating Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Operating Status")).not.toBeInTheDocument();

    // Vitals History heading
    expect(screen.getByText("Last Known Vital History")).toBeInTheDocument();
    expect(screen.queryByText("Vitals History")).not.toBeInTheDocument();
  });

  it("uses normal (non-'Last Known') section headings right up to 48h, and switches to 'Last Known' just past it", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({
      ...vitals,
      projects: [
        {
          ...vitals.projects[0],
          poles: [{ ...vitals.projects[0].poles[0], lastUpdate: recentTimestamp(47) }],
        },
      ],
    });
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Statuses")).toBeInTheDocument();
    expect(screen.getByText("Vitals History")).toBeInTheDocument();
    expect(screen.getAllByText("Operating Status")).toHaveLength(3);
    expect(screen.queryByText("Last Known Statuses")).not.toBeInTheDocument();
  });

  it("does not change the box metric labels at all across the 48h boundary — they're never prefixed regardless of silence", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue({
      ...vitals,
      projects: [
        {
          ...vitals.projects[0],
          poles: [{ ...vitals.projects[0].poles[0], lastUpdate: recentTimestamp(49) }],
        },
      ],
    });
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.getByText("Last Known Statuses")).toBeInTheDocument();
    expect(screen.getAllByText("Operating Status")).toHaveLength(3);
    expect(screen.queryByText("Last Known Operating Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Operating Status")).not.toBeInTheDocument();
  });

  it("shows Fault (red) for a flagged component, and Yes (red) for the Issue Entry box", async () => {
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
              isPoleFault: true,
              isLedFault: true,
              isPanelFault: true,
              isBatteryFault: true,
              isOpenIssueFault: true,
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

    // "Overall Status: Fault" in the header, plus Light/Panel/Battery boxes -> 4 total.
    const faultStats = screen.getAllByText("Fault");
    expect(faultStats).toHaveLength(4);
    for (const stat of faultStats) {
      expect(stat.className).toContain("text-[var(--status-flagged)]");
    }
    const openIssue = screen.getByText("Yes");
    expect(openIssue.className).toContain("text-[var(--status-flagged)]");
  });

  it("shows Disconnected (not a dash) for 48h Connected when isOnline is null but lastUpdate is present, and dashes for the null fault flags", async () => {
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
              isOnline: null,
              isPoleFault: null,
              isLedFault: null,
              isPanelFault: null,
              isBatteryFault: null,
              isOpenIssueFault: null,
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

    expect(screen.getByText("Disconnected")).toBeInTheDocument();
    expect(screen.getByText("48h Overall Status:").parentElement).toHaveTextContent(
      "48h Overall Status: —",
    );

    // Light/Panel/Battery boxes' status + Issue box's status -> 4 dashes,
    // none of them colored.
    const boxHeadings = [
      screen.getByText("Light"),
      screen.getByText("Panel"),
      screen.getByText("Battery"),
      screen.getByText("Issue Entry"),
    ];
    for (const heading of boxHeadings) {
      const statusEl = heading.nextElementSibling;
      expect(statusEl).toHaveTextContent("—");
      expect(statusEl?.className).not.toContain("status-active");
      expect(statusEl?.className).not.toContain("status-flagged");
    }
  });

  it("places the Statuses section above Vitals History and Location", async () => {
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const statusesHeading = screen.getByText("Statuses");
    const vitalsHeading = screen.getByText("Vitals History");
    expect(
      statusesHeading.compareDocumentPosition(vitalsHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
              lampPower1: null,
              lampPower2: null,
              batteryElecCurrent1: null,
              batteryElecCurrent2: null,
              solarBoardVoltage: null,
              solarBoardElecCurrent: null,
              avgBatteryPercentage: null,
              avgPanelPercentage: null,
              avgLightPercentage: null,
              lightStatusLabel: null,
              panelStatusLabel: null,
              panelIdleReason: null,
              batteryStatusLabel: null,
              electricCurrentAverage: null,
              isLedFault: null,
              isBatteryFault: null,
              isPanelFault: null,
              isOpenIssueFault: null,
              isPoleFault: null,
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

  it("shows Unknown for 48h Connected (not a dash) when both isOnline and lastUpdate are null, and dashes elsewhere for a pole with no telemetry", async () => {
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
              lampPower1: null,
              lampPower2: null,
              batteryElecCurrent1: null,
              batteryElecCurrent2: null,
              solarBoardVoltage: null,
              solarBoardElecCurrent: null,
              avgBatteryPercentage: null,
              avgPanelPercentage: null,
              avgLightPercentage: null,
              lightStatusLabel: null,
              panelStatusLabel: null,
              panelIdleReason: null,
              batteryStatusLabel: null,
              electricCurrentAverage: null,
              isLedFault: null,
              isBatteryFault: null,
              isPanelFault: null,
              isOpenIssueFault: null,
              isPoleFault: null,
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

    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("48h Overall Status:").parentElement).toHaveTextContent(
      "48h Overall Status: —",
    );
    for (const heading of [
      screen.getByText("Light"),
      screen.getByText("Panel"),
      screen.getByText("Battery"),
      screen.getByText("Issue Entry"),
    ]) {
      expect(heading.nextElementSibling).toHaveTextContent("—");
    }
    const operatingStatuses = screen.getAllByText("Operating Status");
    expect(operatingStatuses).toHaveLength(3);
    for (const label of operatingStatuses) {
      expect(label.nextElementSibling).toHaveTextContent("—");
    }
    expect(screen.getByText("Battery Percentage").nextElementSibling).toHaveTextContent("—");
  });

  it("shows a dash on the header's Overall Status, all 4 cards (Light/Panel/Battery/Issue), and the 48h Average % metrics when 48h Connected is Unknown, even though every fault flag and percentage has a real (non-null) value", async () => {
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
              isOnline: null,
              lastUpdate: null,
              // Real, non-null fault/percentage data — the point of this
              // test is that it's still overridden to a dash, since
              // Unknown connectivity means this data has no reliable
              // telemetry basis. avgLightPercentage/avgPanelPercentage/
              // avgBatteryPercentage are already real values on the base
              // fixture (11.3/10.8/90.4), left as-is here.
              isLedFault: true,
              isPanelFault: false,
              isBatteryFault: true,
              isOpenIssueFault: false,
              isPoleFault: true,
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

    expect(screen.getByText("Unknown")).toBeInTheDocument();

    // Header's Overall Status — dashed, not "Fault" (isPoleFault is true).
    expect(screen.getByText("48h Overall Status:").parentElement).toHaveTextContent(
      "48h Overall Status: —",
    );

    for (const title of ["Light", "Panel", "Battery", "Issue Entry"]) {
      const badge = screen.getByText(title).nextElementSibling;
      expect(badge).toHaveTextContent("—");
      expect(badge?.className).not.toContain("status-active");
      expect(badge?.className).not.toContain("status-flagged");
    }

    expect(screen.getByText("48h Average Light %").nextElementSibling).toHaveTextContent("—");
    expect(screen.getByText("48h Average Panel %").nextElementSibling).toHaveTextContent("—");
    expect(screen.getByText("48h Average Battery %").nextElementSibling).toHaveTextContent("—");
    // Confirms this isn't a coincidental dash — the real percentages/fault
    // text would otherwise show up as these exact strings.
    expect(screen.queryByText("Fault")).not.toBeInTheDocument();
    expect(screen.queryByText("11.3%")).not.toBeInTheDocument();
    expect(screen.queryByText("10.8%")).not.toBeInTheDocument();
    expect(screen.queryByText("90.4%")).not.toBeInTheDocument();
  });

  it("groups Last Update + Install Date in one column, Lat + Long in another, and Connected + Overall Status in a third", async () => {
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
    // "Connected" text now sits inside a dot+text wrapper span, itself a
    // direct child of the outer right-aligned group — same level as the
    // Overall Status line span.
    const connectedWrapper = screen.getByText("Online").parentElement;
    const overallStatusLine = screen.getByText("48h Overall Status:").parentElement;

    // Last Update and Install Date share the same column (parent).
    expect(lastUpdateLine?.parentElement).toBe(installDateLine?.parentElement);
    // Lat and Long share a different column from Last Update/Install Date.
    expect(latLine?.parentElement).toBe(longLine?.parentElement);
    expect(latLine?.parentElement).not.toBe(lastUpdateLine?.parentElement);
    // Connected and Overall Status share a third group, separate from the other two.
    expect(connectedWrapper?.parentElement).toBe(overallStatusLine?.parentElement);
    expect(connectedWrapper?.parentElement).not.toBe(lastUpdateLine?.parentElement);
    expect(connectedWrapper?.parentElement).not.toBe(latLine?.parentElement);
  });

  it("hides the '48h Connected' label for a Customer Admin, showing a dot + plain Online/Offline text right-aligned, with no Overall Status at all", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", role: "Customer Admin", customerId: "r2" });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText("48h Connected:")).not.toBeInTheDocument();
    expect(screen.queryByText("48h Overall Status:")).not.toBeInTheDocument();
    const online = screen.getByText("Online");
    // The dot indicator sits right alongside the text.
    const dot = online.parentElement?.querySelector("span[aria-hidden]");
    expect(dot?.className).toContain("rounded-full");
    expect(dot?.className).toContain("bg-[var(--status-active)]");
    // The whole group (dot + text) is right-aligned via the outer wrapper.
    expect(online.parentElement?.parentElement?.className).toContain("ml-auto");
  });

  it("hides the same labels for a 'Customer User' (role User, with a customerId) too", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u2", role: "User", customerId: "r2" });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText("48h Connected:")).not.toBeInTheDocument();
    expect(screen.queryByText("48h Overall Status:")).not.toBeInTheDocument();
  });

  it("drops the '48h Connected' label for a Streetleaf Admin too (dot + plain text now, same as customer scope), but still shows the '48h Overall Status' label", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", role: "Streetleaf Admin", customerId: null });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText("48h Connected:")).not.toBeInTheDocument();
    const online = screen.getByText("Online");
    const dot = online.parentElement?.querySelector("span[aria-hidden]");
    expect(dot?.className).toContain("rounded-full");
    expect(screen.getByText("48h Overall Status:")).toBeInTheDocument();
  });

  it("shows only a single simplified metric per box (Operating Status, + Battery Percentage for Battery) for a Customer Admin, dropping the 48h Average/point-in-time metrics", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", role: "Customer Admin", customerId: "r2" });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    // The new simplified metrics are present, using the pole's real values.
    const operatingStatuses = screen.getAllByText("Operating Status");
    expect(operatingStatuses).toHaveLength(3);
    for (const label of operatingStatuses) {
      expect(label.nextElementSibling).toHaveTextContent("OK");
    }
    expect(screen.getByText("Battery Percentage").nextElementSibling).toHaveTextContent("0");
    // Customer scope never gets the Recent/Last Known prefix Streetleaf does.
    expect(screen.queryByText("Recent Operating Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Last Known Operating Status")).not.toBeInTheDocument();

    // The old 48h-average and point-in-time metrics are gone entirely.
    expect(screen.queryByText("48h Average Light %")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Light Power 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Light Power 2")).not.toBeInTheDocument();
    expect(screen.queryByText("48h Average Panel %")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Panel Voltage")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Panel Electric Current")).not.toBeInTheDocument();
    expect(screen.queryByText("48h Average Battery %")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Electric Current 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Electric Current 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Battery Voltage 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Battery Voltage 2")).not.toBeInTheDocument();
  });

  it("appends the idle reason in parentheses in the Panel Status metric when panelStatusLabel is Idle, for a Customer Admin", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", role: "Customer Admin", customerId: "r2" });
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
              panelStatusLabel: "Idle",
              panelIdleReason: "Battery Full",
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

    const panelBox = screen.getByText("Panel").closest(".flex-1") as HTMLElement;
    expect(within(panelBox).getByText("Operating Status").nextElementSibling).toHaveTextContent(
      "Idle (Battery Full)",
    );
  });

  it("shows both the new status-label metrics and the restored old detailed metric set for a Streetleaf Admin, none of them prefixed", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", role: "Streetleaf Admin", customerId: null });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    // New status-label metrics, no prefix.
    const operatingStatuses = screen.getAllByText("Operating Status");
    expect(operatingStatuses).toHaveLength(3);
    for (const label of operatingStatuses) {
      expect(label.nextElementSibling).toHaveTextContent("OK");
    }
    expect(screen.getByText("Battery Percentage").nextElementSibling).toHaveTextContent("0");
    expect(screen.queryByText("Electric Current")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Operating Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Last Known Operating Status")).not.toBeInTheDocument();

    // Restored old detailed metrics, also no prefix.
    expect(screen.getByText("48h Average Light %").nextElementSibling).toHaveTextContent("11.3%");
    expect(screen.getByText("Light Power 1").nextElementSibling).toHaveTextContent("45");
    expect(screen.getByText("Light Power 2").nextElementSibling).toHaveTextContent("46");
    expect(screen.getByText("48h Average Panel %").nextElementSibling).toHaveTextContent("10.8%");
    expect(screen.getByText("Panel Voltage").nextElementSibling).toHaveTextContent("18.565V");
    expect(screen.getByText("Panel Electric Current").nextElementSibling).toHaveTextContent(
      "4.443",
    );
    expect(screen.getByText("48h Average Battery %").nextElementSibling).toHaveTextContent(
      "90.4%",
    );
    expect(screen.getByText("Electric Current 1").nextElementSibling).toHaveTextContent("90");
    expect(screen.getByText("Electric Current 2").nextElementSibling).toHaveTextContent("100");
    expect(screen.getByText("Battery Voltage 1").nextElementSibling).toHaveTextContent("13.509V");
    expect(screen.getByText("Battery Voltage 2").nextElementSibling).toHaveTextContent("13.785V");
  });

  it("positions Battery Percentage directly above Electric Current 1 & 2 in the Battery box, for a Streetleaf Admin", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", role: "Streetleaf Admin", customerId: null });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    const batteryBox = screen.getByText("Battery").closest(".flex-1") as HTMLElement;
    const metricsContainer = batteryBox.querySelector(".mt-4");
    const rowLabels = Array.from(metricsContainer?.children ?? []).map(
      (row) => row.firstElementChild?.textContent,
    );

    expect(rowLabels).toEqual([
      "Operating Status",
      "48h Average Battery %",
      "Battery Percentage",
      "Electric Current 1",
      "Electric Current 2",
      "Battery Voltage 1",
      "Battery Voltage 2",
    ]);
  });

  it("does not show the old detailed metric set for a Customer Admin — only the simplified status-label metrics", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", role: "Customer Admin", customerId: "r2" });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);
    const jsx = await PoleDetailPage({
      params: Promise.resolve({ id: "r2", projectId: "p1", poleId: "pole1" }),
      searchParams: Promise.resolve({}),
    });
    render(jsx);

    expect(screen.queryByText("48h Average Light %")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Light Power 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Light Power 2")).not.toBeInTheDocument();
    expect(screen.queryByText("48h Average Panel %")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Panel Voltage")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Panel Electric Current")).not.toBeInTheDocument();
    expect(screen.queryByText("48h Average Battery %")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Electric Current 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Electric Current 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Battery Voltage 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Battery Voltage 2")).not.toBeInTheDocument();
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
