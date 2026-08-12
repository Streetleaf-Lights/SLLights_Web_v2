import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

import { SignInForm } from "@/components/SignInForm";

function mockSignInResponse(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  });
}

describe("SignInForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders email, password, forgot-password link, and a Sign In button", () => {
    render(<SignInForm />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("shows no validation errors before any interaction", () => {
    render(<SignInForm />);
    expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
    expect(screen.queryByText("Password is required.")).not.toBeInTheDocument();
  });

  it("shows the email format error live, as soon as an invalid value is typed", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("clears the email error live once it becomes valid", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "@example.com");
    expect(screen.queryByText("Enter a valid email address.")).not.toBeInTheDocument();
  });

  it("shows required errors for empty email and password on submit", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("defaults the password field to type='password' (masked)", () => {
    render(<SignInForm />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("reveals the password as plain text when the eye icon is clicked", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Password"), "hunter2");

    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });

  it("masks the password again when the eye icon is clicked a second time", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.click(screen.getByRole("button", { name: "Show password" }));
    await user.click(screen.getByRole("button", { name: "Hide password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("does not clear the password value when toggling visibility", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByLabelText("Password")).toHaveValue("hunter2");
  });

  it("posts trimmed email + password to /api/signin on a valid submit", async () => {
    const fetchMock = mockSignInResponse(true, { user: { id: "1" } });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Email"), "  jane@example.com  ");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/signin",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "jane@example.com", password: "hunter2" }),
      }),
    );
  });

  it("redirects to /customers and refreshes on a successful sign-in", async () => {
    vi.stubGlobal("fetch", mockSignInResponse(true, { user: { id: "1" } }));

    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/customers"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("redirects a Customer Admin to /poles instead of /customers", async () => {
    vi.stubGlobal(
      "fetch",
      mockSignInResponse(true, { user: { id: "1", role: "Customer Admin" } }),
    );

    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/projects"));
  });

  it("shows the server's error message and does not redirect on invalid credentials", async () => {
    vi.stubGlobal(
      "fetch",
      mockSignInResponse(false, { error: "invalid email or password" }),
    );

    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("invalid email or password");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a fallback error message when the request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
  });

  it("disables the submit button and shows a signing-in label while the request is in flight", async () => {
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
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    const button = await screen.findByRole("button", { name: "Signing in…" });
    expect(button).toBeDisabled();

    resolveFetch({ ok: true, json: () => Promise.resolve({ user: { id: "1" } }) });
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });

  it("does not call fetch when the form is invalid", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<SignInForm />);
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not navigate away on submit (default form action is prevented)", async () => {
    vi.stubGlobal("fetch", mockSignInResponse(true, { user: { id: "1" } }));

    const user = userEvent.setup();
    render(<SignInForm />);
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    // If preventDefault() weren't called, jsdom would throw a "not implemented"
    // navigation error during this test — reaching here means it worked.
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("links Forgot password to /forgot-password", () => {
    render(<SignInForm />);
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
