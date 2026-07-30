import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Customer, CustomerPoleVitals, Project } from "@/lib/types";

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

vi.mock("@/lib/session", () => ({
  getSessionUser: getSessionUserMock,
}));

import ProjectsPage from "@/app/projects/page";

const customer: Customer = {
  id: "rec5uaHZMOGZGyVcY",
  name: "Coastal Power & Light",
  projects: [],
  address: "412 Harbor Ave",
  city: "New Orleans",
  state: "LA",
  zip: "70115",
  phone: "504-555-0132",
  createdAt: "2026-02-11 14:20:05-05:00",
};

const projects: Project[] = [
  {
    id: "p1",
    name: "Bayou District Rebuild",
    customerId: "rec5uaHZMOGZGyVcY",
    poleNumbers: ["51079-1000"],
    poleIds: ["rec1"],
    polesUnderContract: 4,
    effectiveDate: "2024-11-25",
    installDates: ["2025-05-23"],
    createdAt: "2024-12-13 12:02:12-05:00",
  },
];

const vitals: CustomerPoleVitals = {
  id: "rec5uaHZMOGZGyVcY",
  name: "Coastal Power & Light",
  totalLights: 54,
  workingPercentage: 90.74,
  optimisticWorkingPercentage: 92.5,
  totalFaults: 1,
  totalNonTelemetryAvailable: 5,
  poles: [],
  projects: [
    {
      id: "p1",
      name: "Bayou District Rebuild",
      totalLights: 54,
      workingPercentage: 90.74,
      optimisticWorkingPercentage: 92.5,
      totalFaults: 1,
      totalNonTelemetryAvailable: 5,
      poles: [],
    },
  ],
};

describe("ProjectsPage", () => {
  beforeEach(() => {
    getCustomerMock.mockReset();
    getProjectsForCustomerMock.mockReset();
    getPoleVitalsForCustomerMock.mockReset();
    getSessionUserMock.mockReset();
  });

  it("looks up the customer using the session's own customerId", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);

    await ProjectsPage();

    expect(getCustomerMock).toHaveBeenCalledWith("rec5uaHZMOGZGyVcY");
    expect(getProjectsForCustomerMock).toHaveBeenCalledWith("rec5uaHZMOGZGyVcY");
    expect(getPoleVitalsForCustomerMock).toHaveBeenCalledWith("rec5uaHZMOGZGyVcY");
  });

  it("renders the same customer overview content as the customer detail page", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);

    const jsx = await ProjectsPage();
    render(jsx);

    expect(screen.getByText("Coastal Power & Light")).toBeInTheDocument();
    expect(screen.getByText("412 Harbor Ave, New Orleans, LA 70115")).toBeInTheDocument();
    expect(screen.getByText("Bayou District Rebuild")).toBeInTheDocument();
  });

  it("does not render a breadcrumb (it's a primary nav destination, not a drill-down page)", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getCustomerMock.mockResolvedValue(customer);
    getProjectsForCustomerMock.mockResolvedValue(projects);
    getPoleVitalsForCustomerMock.mockResolvedValue(vitals);

    const jsx = await ProjectsPage();
    render(jsx);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows a not-found message when there is no session", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const jsx = await ProjectsPage();
    render(jsx);

    expect(
      screen.getByText(/couldn.t find a customer associated with your account/),
    ).toBeInTheDocument();
    expect(getCustomerMock).not.toHaveBeenCalled();
  });

  it("shows a not-found message when the session has no customerId", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", role: "Streetleaf Admin", customerId: null });

    const jsx = await ProjectsPage();
    render(jsx);

    expect(
      screen.getByText(/couldn.t find a customer associated with your account/),
    ).toBeInTheDocument();
    expect(getCustomerMock).not.toHaveBeenCalled();
  });

  it("shows a not-found message when the customer lookup itself comes back empty", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec-does-not-exist",
    });
    getCustomerMock.mockResolvedValue(undefined);

    const jsx = await ProjectsPage();
    render(jsx);

    expect(
      screen.getByText(/couldn.t find a customer associated with your account/),
    ).toBeInTheDocument();
    expect(getProjectsForCustomerMock).not.toHaveBeenCalled();
  });
});
