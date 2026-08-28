import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RemoteControlLink } from "@/components/RemoteControlLink";

describe("RemoteControlLink", () => {
  it("renders a 'Remote Control' trigger, with no modal open yet", () => {
    render(<RemoteControlLink />);
    expect(screen.getByRole("button", { name: "Remote Control" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses the accent color (not accent-ink) for the default trigger styling", () => {
    render(<RemoteControlLink />);
    const trigger = screen.getByRole("button", { name: "Remote Control" });
    expect(trigger.className).toContain("text-[var(--accent)]");
    expect(trigger.className).not.toContain("--accent-ink");
  });

  it("opens a stub modal when clicked", async () => {
    const user = userEvent.setup();
    render(<RemoteControlLink />);
    await user.click(screen.getByRole("button", { name: "Remote Control" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Remote control is coming soon.")).toBeInTheDocument();
  });

  it("closes the modal via the Close button", async () => {
    const user = userEvent.setup();
    render(<RemoteControlLink />);
    await user.click(screen.getByRole("button", { name: "Remote Control" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal when clicking the backdrop", async () => {
    const user = userEvent.setup();
    render(<RemoteControlLink />);
    await user.click(screen.getByRole("button", { name: "Remote Control" }));

    const backdrop = screen.getByRole("dialog").parentElement;
    expect(backdrop).toBeTruthy();
    await user.click(backdrop!);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close the modal when clicking inside the dialog panel itself", async () => {
    const user = userEvent.setup();
    render(<RemoteControlLink />);
    await user.click(screen.getByRole("button", { name: "Remote Control" }));

    await user.click(screen.getByRole("dialog"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("accepts a custom className for the trigger", () => {
    render(<RemoteControlLink className="custom-trigger-class" />);
    expect(screen.getByRole("button", { name: "Remote Control" }).className).toBe(
      "custom-trigger-class",
    );
  });
});
