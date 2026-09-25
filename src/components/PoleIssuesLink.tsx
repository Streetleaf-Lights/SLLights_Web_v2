"use client";

import { useState } from "react";
import type { PoleIssue } from "@/lib/types";

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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-4 text-[12.5px] font-medium text-[var(--accent-ink)] hover:underline"
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
                {issues.map((issue, index) => (
                  <li
                    key={index}
                    className="rounded-md border border-[var(--border)] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-medium text-[var(--ink)]">
                        {issue.poleStatus}
                      </span>
                      <span className="text-[12px] text-[var(--ink-muted)]">{issue.status}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-[var(--ink-muted)]">
                      {issue.problemDetails}
                    </p>
                    <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">
                      Reported {issue.dateReported}
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
