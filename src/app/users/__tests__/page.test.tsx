import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { User } from "@/lib/types";

const { getUsersMock, getCustomersMock, getCustomerMock, getSessionUserMock } = vi.hoisted(() => ({
  getUsersMock: vi.fn(),
  getCustomersMock: vi.fn(),
  getCustomerMock: vi.fn(),
  getSessionUserMock: vi.fn(),
}));

vi.mock("@/lib/apim", () => ({
  getUsers: getUsersMock,
  getCustomers: getCustomersMock,
  getCustomer: getCustomerMock,
}));

vi.mock("@/lib/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import UsersPage from "@/app/users/page";

const users: User[] = [
  {
    id: "user1",
    name: "Jane Doe",
    email: "jane@example.com",
    role: "Customer Admin",
    status: "Active",
    customerId: "rec5uaHZMOGZGyVcY",
    customerName: "Coastal Power & Light",
  },
  {
    id: "user2",
    name: "Alex Rivera",
    email: "alex@streetleaf.com",
    role: "Streetleaf Admin",
    status: "Active",
    customerId: null,
    customerName: null,
  },
  {
    id: "user3",
    name: "Sam Lee",
    email: "sam@otherco.com",
    role: "Customer Admin",
    status: "Active",
    customerId: "rec-other-customer",
    customerName: "Other Co",
  },
  {
    id: "user4",
    name: "Pat Kim",
    email: "pat@example.com",
    role: "Customer Admin",
    status: "Active",
    customerId: "rec5uaHZMOGZGyVcY",
    customerName: "Coastal Power & Light",
  },
];

describe("UsersPage", () => {
  beforeEach(() => {
    getUsersMock.mockReset();
    getCustomersMock.mockReset();
    getCustomerMock.mockReset();
    getCustomerMock.mockResolvedValue(undefined);
    getSessionUserMock.mockReset();
  });

  it("shows all users but hides the Invite User button when no session is present", async () => {
    getSessionUserMock.mockResolvedValue(null);
    getUsersMock.mockResolvedValue(users);
    getCustomersMock.mockResolvedValue([]);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Sam Lee")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite user" })).not.toBeInTheDocument();
  });

  it("shows all users and the Invite User button for a Streetleaf Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Streetleaf Admin",
      customerId: null,
    });
    getUsersMock.mockResolvedValue(users);
    getCustomersMock.mockResolvedValue([]);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Sam Lee")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite user" })).toBeInTheDocument();
    expect(getCustomersMock).toHaveBeenCalled();
  });

  it("scopes the user list to the Customer Admin's own customer", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getUsersMock.mockResolvedValue(users);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Alex Rivera")).not.toBeInTheDocument();
    expect(screen.queryByText("Sam Lee")).not.toBeInTheDocument();
  });

  it("shows the Invite User button for a Customer Admin, locked to their own customer", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getUsersMock.mockResolvedValue(users);
    getCustomerMock.mockResolvedValue({
      id: "rec5uaHZMOGZGyVcY",
      name: "Coastal Power & Light",
      projects: [],
      address: null,
      city: null,
      state: null,
      zip: null,
      phone: null,
      createdAt: "2026-01-01",
    });

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.getByRole("button", { name: "Invite user" })).toBeInTheDocument();
    // Locked to their own customer — getCustomer (not getCustomers, the
    // full browsable list) is what supplies it.
    expect(getCustomerMock).toHaveBeenCalledWith("rec5uaHZMOGZGyVcY");
    expect(getCustomersMock).not.toHaveBeenCalled();
  });

  it("shows the Actions column and a Delete button for other users' rows for a Customer Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getUsersMock.mockResolvedValue(users);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Delete" }).length).toBeGreaterThan(0);
  });

  it("hides the Delete button on a Customer Admin's own row, but still shows it for other users at the same customer", async () => {
    getSessionUserMock.mockResolvedValue({
      // Matches Jane Doe (user1) — logged in as themselves.
      id: "user1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getUsersMock.mockResolvedValue(users);

    const jsx = await UsersPage();
    render(jsx);

    // Jane Doe (self) and Pat Kim (other, same customer) are the only two
    // rows visible to this Customer Admin.
    const janeRow = screen.getByText("Jane Doe").closest("tr") as HTMLElement;
    const patRow = screen.getByText("Pat Kim").closest("tr") as HTMLElement;
    expect(within(janeRow).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(within(patRow).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows the Actions column and Delete button for other users' rows for a Streetleaf Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Streetleaf Admin",
      customerId: null,
    });
    getUsersMock.mockResolvedValue(users);
    getCustomersMock.mockResolvedValue([]);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Delete" }).length).toBeGreaterThan(0);
  });

  it("hides the Delete button on a Streetleaf Admin's own row, but still shows it for everyone else", async () => {
    getSessionUserMock.mockResolvedValue({
      // Matches Alex Rivera (user2) — logged in as themselves.
      id: "user2",
      role: "Streetleaf Admin",
      customerId: null,
    });
    getUsersMock.mockResolvedValue(users);
    getCustomersMock.mockResolvedValue([]);

    const jsx = await UsersPage();
    render(jsx);

    const ownRow = screen.getByText("Alex Rivera").closest("tr") as HTMLElement;
    const otherRow = screen.getByText("Jane Doe").closest("tr") as HTMLElement;
    expect(within(ownRow).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(within(otherRow).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("hides the Actions column entirely for a plain User role, even for other users' rows", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user5",
      role: "User",
      customerId: null,
    });
    getUsersMock.mockResolvedValue(users);
    getCustomersMock.mockResolvedValue([]);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("skips getCustomers() entirely for a Customer Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getUsersMock.mockResolvedValue(users);

    await UsersPage();

    expect(getCustomersMock).not.toHaveBeenCalled();
  });

  it("shows the scoped result count for a Customer Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getUsersMock.mockResolvedValue(users);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.getByText("2 users")).toBeInTheDocument();
  });
});
