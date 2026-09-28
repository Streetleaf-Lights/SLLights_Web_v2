import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PoleIssuesLink } from "@/components/PoleIssuesLink";
import type { PoleIssue } from "@/lib/types";

const sampleIssues: PoleIssue[] = [
  {
    issueId: "ISS-100",
    status: "Open",
    poleStatus: "Electrical Issue",
    dateReported: "2026-09-01 08:15:00-05:00",
    problemDetails: "Lamp flickering at night",
  },
  {
    issueId: "ISS-050",
    status: "Closed",
    poleStatus: "Physical Damage",
    dateReported: "2026-08-15 14:30:00-05:00",
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

  it("uses a recognizable accent color for the link, not a near-black one that blends into body text", () => {
    render(<PoleIssuesLink issues={sampleIssues} />);
    const link = screen.getByRole("button", { name: "View or Report Issue" });
    expect(link.className).toContain("text-[var(--accent)]");
    expect(link.className).not.toContain("text-[var(--accent-ink)]");
  });

  it("shows a pointer cursor on hover for the link, overriding Tailwind's default button cursor reset", () => {
    render(<PoleIssuesLink issues={sampleIssues} />);
    const link = screen.getByRole("button", { name: "View or Report Issue" });
    expect(link.className).toContain("cursor-pointer");
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

  it("sorts issues by dateReported, latest first", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    // ISS-100 (2026-09-01) is later than ISS-050 (2026-08-15).
    expect(within(rows[0]).getByText("ISS-100")).toBeInTheDocument();
    expect(within(rows[1]).getByText("ISS-050")).toBeInTheDocument();
  });

  it("re-sorts correctly regardless of the order issues are passed in", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={[...sampleIssues].reverse()} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("ISS-100")).toBeInTheDocument();
    expect(within(rows[1]).getByText("ISS-050")).toBeInTheDocument();
  });

  it("sorts correctly for the real API's dateReported format — a space before the timezone offset (e.g. '...000 -04:00'), which silently broke Date parsing and left issues in the API's own order instead of being sorted", async () => {
    const realFormatIssues: PoleIssue[] = [
      {
        issueId: "091126-5100-DAD-1024",
        status: "Open",
        poleStatus: "Electrical Issue",
        dateReported: "2026-09-11 16:46:16.000 -04:00",
        problemDetails: "Pole is missing the solar panel",
      },
      {
        issueId: "030426-4338-DAD-1024",
        status: "Closed",
        poleStatus: "Electrical Issue",
        dateReported: "2026-03-04 09:32:09.000 -05:00",
        problemDetails: null,
      },
      {
        issueId: "030526-4348-DAD-1024",
        status: "Closed",
        poleStatus: "Electrical Issue",
        dateReported: "2026-03-05 10:36:20.000 -05:00",
        problemDetails: null,
      },
    ];
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={realFormatIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("091126-5100-DAD-1024")).toBeInTheDocument();
    expect(within(rows[1]).getByText("030526-4348-DAD-1024")).toBeInTheDocument();
    expect(within(rows[2]).getByText("030426-4338-DAD-1024")).toBeInTheDocument();
  });

  it("shows just the poleStatus, with no trailing colon, when problemDetails is null", async () => {
    const issuesWithNullDetails: PoleIssue[] = [
      {
        issueId: "030426-4338-DAD-1024",
        status: "Closed",
        poleStatus: "Electrical Issue",
        dateReported: "2026-03-04 09:32:09.000 -05:00",
        problemDetails: null,
      },
    ];
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={issuesWithNullDetails} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    expect(screen.getByText("Electrical Issue")).toBeInTheDocument();
    expect(screen.queryByText("Electrical Issue:")).not.toBeInTheDocument();
    expect(screen.queryByText(/Electrical Issue:\s*$/)).not.toBeInTheDocument();
  });

  it("shows each issue's issueId as the bold element on the first line", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    const issueIdEl = screen.getByText("ISS-100");
    expect(issueIdEl.className).toContain("font-semibold");
  });

  it("colors an 'Open' status red/flagged", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    const openStatus = screen.getByText("Open");
    expect(openStatus.className).toContain("text-[var(--status-flagged)]");
  });

  it("colors a 'Closed' status green/active", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    const closedStatus = screen.getByText("Closed");
    expect(closedStatus.className).toContain("text-[var(--status-active)]");
  });

  it("shows poleStatus and problemDetails together, italicized, as 'PoleStatus: ProblemDetails' on the second line", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    const line2 = screen.getByText("Electrical Issue: Lamp flickering at night");
    expect(line2.className).toContain("italic");
  });

  it("shows dateReported truncated to minutes (no seconds) on the third line", async () => {
    const user = userEvent.setup();
    render(<PoleIssuesLink issues={sampleIssues} />);
    await user.click(screen.getByRole("button", { name: "View or Report Issue" }));

    expect(screen.getByText("Reported 2026-09-01 08:15")).toBeInTheDocument();
    expect(screen.queryByText(/08:15:00/)).not.toBeInTheDocument();
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
