"use client";

import { useState } from "react";
import type { PoleIssue } from "@/lib/types";
import { formatTimestamp } from "@/lib/text";

/** Green for a resolved issue, red for an open one, neutral for anything else. */
function issueStatusClassName(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "open") return "text-[var(--status-flagged)]";
  if (normalized === "closed") return "text-[var(--status-active)]";
  return "text-[var(--ink-muted)]";
}

/**
 * The API sends dateReported as e.g. "2026-09-11 16:46:16.000 -04:00" — a
 * space between date and time (needs to become "T" for Date to parse it
 * at all), *and* another space between the fractional seconds and the
 * offset, which Date's parser rejects outright (silently producing an
 * Invalid Date, whose getTime() is NaN — and since comparing two NaNs in
 * a sort comparator never reorders anything, every issue silently stayed
 * in the API's own order instead of actually being sorted). Stripping
 * that second space is the fix; the first replace still only touches the
 * date/time separator, same as before.
 */
function parseDateReported(dateReported: string): number {
  const isoLike = dateReported
    .trim()
    .replace(" ", "T")
    .replace(/\s+([+-]\d{2}:\d{2}|Z)$/, "$1");
  return new Date(isoLike).getTime();
}

/**
 * Link + modal shown under the pole detail page's Issue Entry card.
 * Label depends on whether this pole has any reported issues: "View or
 * Report Issue" when it does (there's something to view), plain "Report
 * Issue" when it doesn't. The modal itself is a stub for now — it lists
 * any existing issues (real data we already have), but doesn't yet
 * support actually submitting a new one.
 */
export function PoleIssuesLink({ issues }: { issues: PoleIssue[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasIssues = issues.length > 0;
  // Latest first.
  const sortedIssues = [...issues].sort(
    (a, b) => parseDateReported(b.dateReported) - parseDateReported(a.dateReported),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-4 cursor-pointer text-[12.5px] font-medium text-[var(--accent)] hover:underline"
      >
        {hasIssues ? "View or Report Issue" : "Report Issue"}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pole-issues-title"
            className="w-full max-w-[480px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="pole-issues-title"
              className="text-[16px] font-semibold text-[var(--ink)]"
            >
              Pole Issues
            </h2>

            {hasIssues ? (
              <ul className="mt-4 flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
                {sortedIssues.map((issue) => (
                  <li
                    key={issue.issueId}
                    className="rounded-md border border-[var(--border)] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-semibold text-[var(--ink)]">
                        {issue.issueId}
                      </span>
                      <span
                        className={`text-[12px] font-medium ${issueStatusClassName(issue.status)}`}
                      >
                        {issue.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] italic text-[var(--ink-muted)]">
                      {issue.problemDetails
                        ? `${issue.poleStatus}: ${issue.problemDetails}`
                        : issue.poleStatus}
                    </p>
                    <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">
                      Reported {formatTimestamp(issue.dateReported)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] text-[var(--ink-muted)]">
                No issues reported for this pole yet.
              </p>
            )}

            {/* Stub — reporting a new issue isn&apos;t built yet. */}
            <p className="mt-4 text-[12px] text-[var(--ink-faint)]">
              Reporting a new issue isn&apos;t available yet — coming soon.
            </p>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-[var(--border)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-sunken)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
