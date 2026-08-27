import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PoleSummary } from "@/lib/types";

const { getPolesMock, getSessionUserMock } = vi.hoisted(() => ({
  getPolesMock: vi.fn(),
  getSessionUserMock: vi.fn(),
}));

vi.mock("@/lib/apim", () => ({
  getPoles: getPolesMock,
}));

vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getSessionUser: getSessionUserMock,
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import PolesPage from "@/app/poles/page";

const poles: PoleSummary[] = [
  {
    id: "p1",
    poleNumber: "51079-1000",
    locationId: "loc-1",
    installDate: null,
    lat: null,
    long: null,
    lastUpdate: null,
    lightStatus: null,
    isOnline: true,
    avgBatteryPercentage: null,
    avgPanelPercentage: null,
    avgLightPercentage: null,
    lightStatusLabel: null,
    panelStatusLabel: null,
    panelIdleReason: null,
    batteryStatusLabel: null,
    electricCurrentAverage: null,
    lampPower1: null,
    lampPower2: null,
    batteryElecCurrent1: null,
    batteryElecCurrent2: null,
    solarBoardVoltage: null,
    solarBoardElecCurrent: null,
    isLedFault: null,
    isBatteryFault: null,
    isPanelFault: null,
    isOpenIssueFault: null,
    isPoleFault: null,
    projectId: "proj-1",
    customerId: "rec5uaHZMOGZGyVcY",
  },
];

describe("PolesPage", () => {
  it("fetches all poles (no filter) when no session is present", async () => {
    getSessionUserMock.mockResolvedValue(null);
    getPolesMock.mockResolvedValue(poles);

    await PolesPage();

    expect(getPolesMock).toHaveBeenCalledWith(undefined);
  });

  it("fetches all poles (no filter) for a Streetleaf Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Streetleaf Admin",
      customerId: null,
    });
    getPolesMock.mockResolvedValue(poles);

    await PolesPage();

    expect(getPolesMock).toHaveBeenCalledWith(undefined);
  });

  it("scopes poles to the Customer Admin's own customer", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getPolesMock.mockResolvedValue(poles);

    await PolesPage();

    expect(getPolesMock).toHaveBeenCalledWith({ customerId: "rec5uaHZMOGZGyVcY" });
  });

  it("shows a customer-scoped description for a Customer Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getPolesMock.mockResolvedValue(poles);

    const jsx = await PolesPage();
    render(jsx);

    expect(screen.getByText("Every pole for your customer.")).toBeInTheDocument();
  });

  it("hides the 48h Connected column and shows 'Overall Status' (no '48h') for a Customer Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getPolesMock.mockResolvedValue(poles);

    const jsx = await PolesPage();
    render(jsx);

    expect(screen.queryByRole("columnheader", { name: "48h Connected" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Overall Status" })).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "48h Overall Status" }),
    ).not.toBeInTheDocument();
  });

  it("still shows the 48h Connected column and '48h Overall Status' label for a Streetleaf Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Streetleaf Admin",
      customerId: null,
    });
    getPolesMock.mockResolvedValue(poles);

    const jsx = await PolesPage();
    render(jsx);

    expect(screen.getByRole("columnheader", { name: "48h Connected" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "48h Overall Status" })).toBeInTheDocument();
  });

  it("shows the all-customers description for a Streetleaf Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Streetleaf Admin",
      customerId: null,
    });
    getPolesMock.mockResolvedValue(poles);

    const jsx = await PolesPage();
    render(jsx);

    expect(
      screen.getByText("Every pole across all customers and projects."),
    ).toBeInTheDocument();
  });

  it("scopes poles to a 'Customer User's own customer, same as a Customer Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u2",
      role: "User",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getPolesMock.mockResolvedValue(poles);

    await PolesPage();

    expect(getPolesMock).toHaveBeenCalledWith({ customerId: "rec5uaHZMOGZGyVcY" });
  });

  it("shows a customer-scoped description for a 'Customer User'", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u2",
      role: "User",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getPolesMock.mockResolvedValue(poles);

    const jsx = await PolesPage();
    render(jsx);

    expect(screen.getByText("Every pole for your customer.")).toBeInTheDocument();
  });

  it("fetches all poles (no filter) for a 'Streetleaf User' (role User, no customerId) — same as a Streetleaf Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u3",
      role: "User",
      customerId: null,
    });
    getPolesMock.mockResolvedValue(poles);

    await PolesPage();

    expect(getPolesMock).toHaveBeenCalledWith(undefined);
  });
});
