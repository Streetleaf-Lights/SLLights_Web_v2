import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { InviteUserModal } from "@/components/InviteUserModal";
import type { Customer } from "@/lib/types";

const customers: Customer[] = [
  {
    id: "cust-1",
    name: "Bayview Municipal Lighting",
    projects: [],
    address: null,
    city: null,
    state: null,
    zip: null,
    phone: null,
    createdAt: "2026-01-01",
  },
  {
    id: "cust-2",
    name: "Coastal Power & Light",
    projects: [],
    address: null,
    city: null,
    state: null,
    zip: null,
    phone: null,
    createdAt: "2026-01-01",
  },
  {
    id: "cust-3",
    name: "Highline Telecom Cooperative",
    projects: [],
    address: null,
    city: null,
    state: null,
    zip: null,
    phone: null,
    createdAt: "2026-01-01",
  },
];

type SetupUser = ReturnType<typeof userEvent.setup>;

async function openModal() {
  const user = userEvent.setup();
  render(<InviteUserModal customers={customers} />);
  await user.click(screen.getByRole("button", { name: "Invite user" }));
  return user;
}

/** Reveals the customer list by focusing the search box, without typing anything into it. */
async function focusCustomerSearch(user: SetupUser) {
  await user.click(screen.getByLabelText("Customer Search"));
}

function mockInviteResponse(ok: boolean, body: unknown, status = ok ? 200 : 400) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

const successBody = {
  userId: "8714b64b-1186-487a-820a-6ee0c53a2b25",
  email: "minh+9@streetleaf.com",
  emailSent: true,
};

describe("InviteUserModal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  it("does not show the modal until the trigger is clicked", () => {
    render(<InviteUserModal customers={customers} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("labels the customer search field 'Customer Search' (not just 'Customer')", async () => {
    await openModal();
    expect(screen.getByText("Customer Search")).toBeInTheDocument();
    expect(screen.queryByText("Customer", { selector: "label" })).not.toBeInTheDocument();
  });

  it("opens the modal with the customer search left blank", async () => {
    await openModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Customer Search")).toHaveValue("");
  });

  it("focuses the email input (not the customer search) as soon as the modal opens", async () => {
    await openModal();
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(screen.getByLabelText("Customer Search")).not.toHaveFocus();
  });

  it("does not show the customer list until the search box is focused", async () => {
    await openModal();
    expect(
      screen.queryByRole("button", { name: "Bayview Municipal Lighting" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Coastal Power & Light" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Highline Telecom Cooperative" }),
    ).not.toBeInTheDocument();
  });

  it("shows all customers once the search box is focused (empty search)", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);

    expect(screen.getByRole("button", { name: "Bayview Municipal Lighting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coastal Power & Light" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Highline Telecom Cooperative" }),
    ).toBeInTheDocument();
  });

  it("selects the existing text in the customer search box when refocused", async () => {
    const user = await openModal();
    const input = screen.getByLabelText("Customer Search") as HTMLInputElement;
    await user.type(input, "Coastal");
    await user.click(screen.getByLabelText("Email"));
    await user.click(input);

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("Coastal".length);
  });

  it("selects the existing text in the customer search box when refocused via Change", async () => {
    const user = await openModal();
    const input = screen.getByLabelText("Customer Search") as HTMLInputElement;
    await user.type(input, "Coastal");
    await user.click(screen.getByRole("button", { name: "Coastal Power & Light" }));
    await user.click(screen.getByRole("button", { name: "Change" }));

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("Coastal".length);
  });

  it("shows all customers again when the search is cleared", async () => {
    const user = await openModal();
    await user.type(screen.getByLabelText("Customer Search"), "Coastal");
    expect(
      screen.queryByRole("button", { name: "Bayview Municipal Lighting" }),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Customer Search"));

    expect(screen.getByRole("button", { name: "Bayview Municipal Lighting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Coastal Power & Light" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Highline Telecom Cooperative" })).toBeInTheDocument();
  });

  it("shows the selected customer's name with a 'Selected' label above the Customer Search label, with no box around it", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Bayview Municipal Lighting" }));

    expect(screen.getByText("Selected:")).toBeInTheDocument();
    const selectedName = screen.getByText("Bayview Municipal Lighting", { selector: "span" });
    const searchLabel = screen.getByText("Customer Search");
    // The selected-customer row appears before the "Customer Search" label in the DOM (above it).
    expect(
      selectedName.compareDocumentPosition(searchLabel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // No box: the containing row shouldn't carry border/background styling.
    const row = screen.getByText("Selected:").parentElement;
    expect(row?.className).not.toContain("border");
    expect(row?.className).not.toContain("bg-[");
  });

  it("colors the selected customer's name teal", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Bayview Municipal Lighting" }));

    const selectedName = screen.getByText("Bayview Municipal Lighting", { selector: "span" });
    expect(selectedName.className).toContain("text-[var(--accent)]");
  });

  it("lays out the Selected row with label+name on the left and Change on the right", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Bayview Municipal Lighting" }));

    const row = screen.getByText("Selected:").parentElement!;
    expect(row.className).toContain("justify-between");
    const changeButton = screen.getByRole("button", { name: "Change" });
    // "Selected: ..." precedes "Change" in the DOM within that flex row.
    expect(
      screen.getByText("Selected:").compareDocumentPosition(changeButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("hides the customer list once a customer is selected", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    expect(screen.getByRole("button", { name: "Coastal Power & Light" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Coastal Power & Light" }));

    expect(screen.queryByRole("button", { name: "Bayview Municipal Lighting" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Highline Telecom Cooperative" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the search box visible after a selection is made", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Bayview Municipal Lighting" }));

    expect(screen.getByLabelText("Customer Search")).toBeInTheDocument();
  });

  it("shows the customer list again when clicking directly into the search box, without needing Change", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Bayview Municipal Lighting" }));
    expect(screen.queryByRole("button", { name: "Bayview Municipal Lighting" })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Customer Search"));

    expect(screen.getByRole("button", { name: "Bayview Municipal Lighting" })).toBeInTheDocument();
    // The selection itself is untouched by just reopening the list.
    expect(screen.getByText("Selected:")).toBeInTheDocument();
  });

  it("hides the list again immediately once a new customer is picked from it", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Bayview Municipal Lighting" }));
    await user.click(screen.getByLabelText("Customer Search"));
    await user.clear(screen.getByLabelText("Customer Search"));
    expect(screen.getByRole("button", { name: "Coastal Power & Light" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Coastal Power & Light" }));

    expect(screen.queryByRole("button", { name: "Bayview Municipal Lighting" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Highline Telecom Cooperative" }),
    ).not.toBeInTheDocument();
  });

  it("shows the customer list again after clicking Change", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Bayview Municipal Lighting" }));
    expect(screen.queryByRole("button", { name: "Bayview Municipal Lighting" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Change" }));

    expect(screen.getByRole("button", { name: "Bayview Municipal Lighting" })).toBeInTheDocument();
    expect(screen.queryByText("Selected:")).not.toBeInTheDocument();
  });

  it("refocuses the search box after clicking Change", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Bayview Municipal Lighting" }));

    await user.click(screen.getByRole("button", { name: "Change" }));

    expect(screen.getByLabelText("Customer Search")).toHaveFocus();
  });

  it("defaults the role to 'Streetleaf Admin' when no customer is selected", async () => {
    await openModal();

    expect(screen.getByLabelText("Role")).toHaveValue("Streetleaf Admin");
  });

  it("sets the role to 'Customer Admin' once any customer is selected", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Coastal Power & Light" }));

    expect(screen.getByLabelText("Role")).toHaveValue("Customer Admin");
  });

  it("reverts the role back to 'Streetleaf Admin' after Change clears the selection", async () => {
    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Coastal Power & Light" }));
    expect(screen.getByLabelText("Role")).toHaveValue("Customer Admin");

    await user.click(screen.getByRole("button", { name: "Change" }));

    expect(screen.getByLabelText("Role")).toHaveValue("Streetleaf Admin");
  });

  it("deselects the customer and reverts the role to 'Streetleaf Admin' when the search box is cleared", async () => {
    const user = await openModal();
    const input = screen.getByLabelText("Customer Search") as HTMLInputElement;
    await user.type(input, "Coastal");
    await user.click(screen.getByRole("button", { name: "Coastal Power & Light" }));
    expect(screen.getByLabelText("Role")).toHaveValue("Customer Admin");

    await user.clear(input);

    expect(screen.getByLabelText("Role")).toHaveValue("Streetleaf Admin");
    expect(screen.queryByText("Selected:")).not.toBeInTheDocument();
  });

  it("keeps the Role field disabled (grayed out)", async () => {
    await openModal();
    expect(screen.getByLabelText("Role")).toBeDisabled();
  });

  it("shows no email/name errors before attempting to submit", async () => {
    await openModal();
    expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Name is required.")).not.toBeInTheDocument();
  });

  it("shows the email format error live, as soon as an invalid value is typed — no Submit needed", async () => {
    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "not-an-email");

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("clears the email error live as soon as it becomes valid — no Submit needed", async () => {
    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "@example.com");
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
  });

  it("shows the name-required error live once the field is typed into and cleared — no Submit needed", async () => {
    const user = await openModal();
    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "a");
    expect(screen.queryByText("Name is required.")).not.toBeInTheDocument();

    await user.clear(nameInput);
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
  });

  it("shows required errors for empty email and name on submit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = await openModal();
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an invalid-format error for a malformed email on submit", async () => {
    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("clears the email error once a valid email is entered", async () => {
    const user = await openModal();
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByText("Email is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
  });

  it("posts trimmed name/email, the derived role, and no customerId for a Streetleaf Admin invite", async () => {
    const fetchMock = mockInviteResponse(true, successBody);
    vi.stubGlobal("fetch", fetchMock);

    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "  jane@example.com  ");
    await user.type(screen.getByLabelText("Name"), "  Jane Doe  ");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/inviteuser");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ name: "Jane Doe", email: "jane@example.com", role: "Streetleaf Admin" });
    expect(body.customerId).toBeUndefined();
  });

  it("includes the selected customer's id and 'Customer Admin' role when a customer is selected", async () => {
    const fetchMock = mockInviteResponse(true, successBody);
    vi.stubGlobal("fetch", fetchMock);

    const user = await openModal();
    await focusCustomerSearch(user);
    await user.click(screen.getByRole("button", { name: "Coastal Power & Light" }));
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      role: "Customer Admin",
      customerId: "cust-2",
    });
  });

  it("closes the modal on a successful submit", async () => {
    vi.stubGlobal("fetch", mockInviteResponse(true, successBody));

    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("refreshes the page's server data after a successful submit, so the new user shows up", async () => {
    vi.stubGlobal("fetch", mockInviteResponse(true, successBody));

    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it("does not refresh the page's server data when the submit fails", async () => {
    vi.stubGlobal("fetch", mockInviteResponse(false, { error: "email already invited" }));

    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await screen.findByRole("alert");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("shows the server's error message and does not close the modal on failure", async () => {
    vi.stubGlobal("fetch", mockInviteResponse(false, { error: "email already invited" }));

    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("email already invited");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("redirects to /signin (instead of showing an inline error) when the session actually expired (401)", async () => {
    vi.stubGlobal(
      "fetch",
      mockInviteResponse(false, { error: "session expired, please sign in again" }, 401),
    );

    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signin"));
    expect(refreshMock).toHaveBeenCalled();
    // No dead-end inline error, and the modal closes — the person is just
    // sent to sign back in.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a fallback error message when the request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });

  it("disables Submit and shows a 'Sending…' label while the request is in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      ),
    );

    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    const button = await screen.findByRole("button", { name: "Sending…" });
    expect(button).toBeDisabled();

    resolveFetch({ ok: true, json: () => Promise.resolve(successBody) });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the modal and resets state when Cancel is clicked", async () => {
    const user = await openModal();
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Invite user" }));
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Customer Search")).toHaveValue("");
    // The stale "touched" state from before Cancel shouldn't carry over.
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
  });

  it("closes the modal when clicking the backdrop", async () => {
    const user = await openModal();
    // The backdrop is the dialog's parent overlay element.
    const backdrop = screen.getByRole("dialog").parentElement;
    expect(backdrop).toBeTruthy();
    await user.click(backdrop!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
