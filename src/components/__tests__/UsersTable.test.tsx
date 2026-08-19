import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { UsersTable } from "@/components/UsersTable";
import type { User } from "@/lib/types";

function mockDeleteResponse(ok: boolean, body: unknown = { success: true }, status = ok ? 200 : 400) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockReinviteResponse(ok: boolean, body: unknown = { success: true }, status = ok ? 200 : 400) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("UsersTable", () => {
  afterEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    vi.unstubAllGlobals();
  });

  const users: User[] = [
    {
      id: "user1",
      name: "Jane Doe",
      email: "jane@example.com",
      role: "Customer Admin",
      status: "Active",
      customerId: "cust1",
      customerName: "Acme Corp",
    },
    {
      id: "user-04",
      name: "Colin Ashworth",
      email: "colin.ashworth@internal.co",
      role: "Viewer",
      status: "Inactive",
      customerId: "cust-004",
      customerName: "Summit Rural Electric",
    },
    {
      id: "user-pending",
      name: "Priya Nair",
      email: "priya@example.com",
      role: "Editor",
      status: "Pending",
      customerId: "cust-005",
      customerName: "Riverside Cooperative",
    },
  ];

  it("renders a row per user with name, email, role, and customer", () => {
    render(<UsersTable users={users} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Customer Admin")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("does not crash and falls back to Inactive when status is undefined (not just a string)", () => {
    const userWithMissingStatus = { ...users[0], status: undefined } as unknown as User;
    render(<UsersTable users={[userWithMissingStatus]} />);

    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("does not render a Last Active column", () => {
    render(<UsersTable users={users} />);
    expect(screen.queryByRole("columnheader", { name: /last active/i })).not.toBeInTheDocument();
  });

  it("shows a Customer column instead", () => {
    render(<UsersTable users={users} />);
    expect(screen.getByRole("columnheader", { name: "Customer" })).toBeInTheDocument();
  });

  it("shows 'Streetleaf' as the customer when customerId is null", () => {
    const internalUser: User = {
      id: "user-internal",
      name: "Alex Rivera",
      email: "alex.rivera@streetleaf.com",
      role: "Streetleaf Admin",
      status: "Active",
      customerId: null,
      customerName: null,
    };
    render(<UsersTable users={[...users, internalUser]} />);

    const row = screen.getByText("Alex Rivera").closest("tr")!;
    expect(row).toHaveTextContent("Streetleaf");
  });

  it("shows the real customerName when customerId is present", () => {
    render(<UsersTable users={users} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.queryByText("Streetleaf")).not.toBeInTheDocument();
  });

  it("shows Active/Inactive based on the status field", () => {
    render(<UsersTable users={users} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("shows the role as plain text (not restricted to a fixed set)", () => {
    render(<UsersTable users={users} />);
    expect(screen.getByText("Customer Admin")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
  });

  it("renders a Delete button for each row", () => {
    render(<UsersTable users={users} />);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(3);
  });

  it("hides the Delete button only on the row matching currentUserId, showing it for everyone else", () => {
    render(<UsersTable users={users} currentUserId="user1" />);

    const ownRow = screen.getByText("Jane Doe").closest("tr") as HTMLElement;
    expect(within(ownRow).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    // The other two rows are unaffected.
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(2);
  });

  it("shows Delete on every row when currentUserId doesn't match any of them", () => {
    render(<UsersTable users={users} currentUserId="someone-else" />);
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(3);
  });

  it("renders a Re-invite button only for a Pending user, not Active/Inactive ones", () => {
    render(<UsersTable users={users} />);
    expect(screen.getAllByRole("button", { name: "Re-invite" })).toHaveLength(1);

    const pendingRow = screen.getByText("Priya Nair").closest("tr") as HTMLElement;
    expect(within(pendingRow).getByRole("button", { name: "Re-invite" })).toBeInTheDocument();
  });

  it("sends the pending user's id to /api/resendinvite and shows a success message on Re-invite", async () => {
    const fetchMock = mockReinviteResponse(true);
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getByRole("button", { name: "Re-invite" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/resendinvite",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "user-pending" }),
      }),
    );
    expect(await screen.findByText("Invite sent.")).toBeInTheDocument();
  });

  it("shows a disabled 'Sending…' label while the resend request is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getByRole("button", { name: "Re-invite" }));

    const button = await screen.findByRole("button", { name: "Sending…" });
    expect(button).toBeDisabled();

    resolveFetch({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) });
    await screen.findByText("Invite sent.");
  });

  it("shows the server's error message when the resend fails", async () => {
    vi.stubGlobal(
      "fetch",
      mockReinviteResponse(false, { error: "user already registered" }, 409),
    );

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getByRole("button", { name: "Re-invite" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("user already registered");
  });

  it("shows a fallback error message when the resend request itself throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getByRole("button", { name: "Re-invite" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });

  it("redirects to /signin on a 401 from the resend request", async () => {
    vi.stubGlobal(
      "fetch",
      mockReinviteResponse(false, { error: "session expired" }, 401),
    );

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getByRole("button", { name: "Re-invite" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signin"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("does not render a Re-invite button when canManageUsers is false (a plain User viewing users)", () => {
    render(<UsersTable users={users} canManageUsers={false} />);
    expect(screen.queryByRole("button", { name: "Re-invite" })).not.toBeInTheDocument();
  });

  it("shows the Actions column header by default", () => {
    render(<UsersTable users={users} />);
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
  });

  it("hides the Actions column and Delete buttons when canManageUsers is false", () => {
    render(<UsersTable users={users} canManageUsers={false} />);
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("does not delete immediately — opens a confirmation modal instead", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("names the user being deleted in the confirmation modal", async () => {
    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(screen.getByRole("dialog")).toHaveTextContent("Jane Doe");
  });

  it("closes the modal without deleting when Cancel is clicked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("closes the modal without deleting when the backdrop is clicked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    const backdrop = screen.getByRole("dialog").parentElement!;
    await user.click(backdrop);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the user's id to /api/deleteuser when the delete is confirmed", async () => {
    const fetchMock = mockDeleteResponse(true);
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/deleteuser");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ userId: "user1" });
  });

  it("closes the modal and refreshes the page's server data after a successful delete", async () => {
    vi.stubGlobal("fetch", mockDeleteResponse(true));

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("shows the server's error message and keeps the modal open on failure", async () => {
    vi.stubGlobal("fetch", mockDeleteResponse(false, { error: "cannot delete the last admin" }));

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("cannot delete the last admin");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("redirects to /signin (instead of showing an inline error) when the session actually expired (401)", async () => {
    vi.stubGlobal(
      "fetch",
      mockDeleteResponse(false, { error: "session expired, please sign in again" }, 401),
    );

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signin"));
    expect(refreshMock).toHaveBeenCalled();
    // No dead-end inline error — the person is just sent to sign back in.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a fallback error message when the delete request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });

  it("disables the confirm button and shows 'Deleting…' while the request is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );

    const user = userEvent.setup();
    render(<UsersTable users={users} />);
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    const confirmButton = await screen.findByRole("button", { name: "Deleting…" });
    expect(confirmButton).toBeDisabled();

    resolveFetch({ ok: true, json: () => Promise.resolve({ success: true }) });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("renders no rows for an empty list", () => {
    render(<UsersTable users={[]} />);
    expect(screen.getAllByRole("row")).toHaveLength(1); // header row only
  });

  it("paginates at 10 rows per page", async () => {
    const many: User[] = Array.from({ length: 25 }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: "Viewer",
      status: "Active",
      customerId: "cust1",
      customerName: "Acme Corp",
    }));
    const user = userEvent.setup();
    render(<UsersTable users={many} />);

    // 10 data rows + 1 header row
    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.queryByText("User 11")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("User 11")).toBeInTheDocument();
    expect(screen.queryByText("User 1")).not.toBeInTheDocument();
  });
});
