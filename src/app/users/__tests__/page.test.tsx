import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { User } from "@/lib/types";

const { getUsersMock, getCustomersMock, getSessionUserMock } = vi.hoisted(() => ({
  getUsersMock: vi.fn(),
  getCustomersMock: vi.fn(),
  getSessionUserMock: vi.fn(),
}));

vi.mock("@/lib/apim", () => ({
  getUsers: getUsersMock,
  getCustomers: getCustomersMock,
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
];

describe("UsersPage", () => {
  beforeEach(() => {
    getUsersMock.mockReset();
    getCustomersMock.mockReset();
    getSessionUserMock.mockReset();
  });

  it("shows all users and the Invite User button when no session is present", async () => {
    getSessionUserMock.mockResolvedValue(null);
    getUsersMock.mockResolvedValue(users);
    getCustomersMock.mockResolvedValue([]);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Sam Lee")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invite user" })).toBeInTheDocument();
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

  it("hides the Invite User button for a Customer Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getUsersMock.mockResolvedValue(users);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.queryByRole("button", { name: "Invite user" })).not.toBeInTheDocument();
  });

  it("hides the Actions column and Delete button for a Customer Admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "u1",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
    getUsersMock.mockResolvedValue(users);

    const jsx = await UsersPage();
    render(jsx);

    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("shows the Actions column and Delete button for a Streetleaf Admin", async () => {
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

    expect(screen.getByText("1 users")).toBeInTheDocument();
  });
});
