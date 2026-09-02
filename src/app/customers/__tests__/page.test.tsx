import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getCustomersMock } = vi.hoisted(() => ({ getCustomersMock: vi.fn() }));

vi.mock("@/lib/apim", () => ({
  getCustomers: getCustomersMock,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import CustomersPage from "@/app/customers/page";

describe("CustomersPage", () => {
  it("calls getCustomers with active: true, so inactive customers don't show on the list", async () => {
    getCustomersMock.mockResolvedValue([]);

    await CustomersPage();

    expect(getCustomersMock).toHaveBeenCalledWith({ active: true });
  });

  it("renders the Customers page title and passes the fetched customers through", async () => {
    getCustomersMock.mockResolvedValue([
      {
        id: "r1",
        name: "Coastal Power & Light",
        projects: [],
        address: null,
        city: null,
        state: null,
        zip: null,
        phone: null,
        active: true,
        createdAt: "2026-01-01",
      },
    ]);

    const jsx = await CustomersPage();
    render(jsx);

    expect(screen.getByRole("heading", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByText("Coastal Power & Light")).toBeInTheDocument();
  });
});
