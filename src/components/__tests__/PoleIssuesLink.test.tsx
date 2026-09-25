import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PoleIssuesLink } from "@/components/PoleIssuesLink";
import type { PoleIssue } from "@/lib/types";

const sampleIssues: PoleIssue[] = [
  {
    status: "Open",
    poleStatus: "Electrical Issue",
    dateReported: "2026-09-01",
    problemDetails: "Lamp flickering at night",
  },
  {
    status: "Resolved",
    poleStatus: "Physical Damage",
    dateReported: "2026-08-15",
    problemDetails: "Pole leaning after storm",
  },
];

describe("PoleIssuesLink", () => {
  it("shows 'Report Issue' when there are no issues", () => {
    render(<PoleIssuesLink issues={[]} />);
    expect(screen.getByRole("button", { name: "Report Issue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View or Report Issue" })).not.toBeInTheDocument();
  });

  it("shows 'View or Report Issue' when the pole has at least one issue", () => {
    render(<PoleIssuesLink issues={sampleIssues} />);
    expect(screen.getByRole("button", { name: "View or Report Issue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Report Issue" })).not.toBeInTheDocument();
  });

  it("does not show the modal before the link is clicked", () => {
    render(<PoleIssuesLink issues={sampleIssues} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the modal when the link is clicked", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Pole Issues")).toBeInTheDocument();
  });

  it("lists every issue's poleStatus, status, problemDetails, and dateReported when there are issues", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    expect(screen.getByText("Electrical Issue")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Lamp flickering at night")).toBeInTheDocument();
    expect(screen.getByText(/Reported 2026-09-01/)).toBeInTheDocument();

    expect(screen.getByText("Physical Damage")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Pole leaning after storm")).toBeInTheDocument();
    expect(screen.getByText(/Reported 2026-08-15/)).toBeInTheDocument();
  });

  it("shows an empty-state message instead of a list when there are no issues", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={[]} />);
    await user.click(screen.getByRole("button", { name: "Report Issue" }));

    expect(screen.getByText("No issues reported for this pole yet.")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("shows a stub note that reporting a new issue isn't available yet", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    expect(screen.getByText(/isn.t available yet/)).toBeInTheDocument();
  });

  it("closes the modal when Close is clicked", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));
    const backdrop = screen.getByRole("dialog").parentElement!;

    await user.click(backdrop);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close the modal when clicking inside the dialog itself", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    await user.click(screen.getByText("Pole Issues"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
