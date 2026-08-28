"use client";

import { useState } from "react";

/**
 * A "Remote Control" link that opens a placeholder modal — real remote
 * control (on/off, brightness, etc. via the Leadsun API) isn't wired up
 * yet, this just establishes where the entry point lives on each page.
 */
export function RemoteControlLink({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  function close() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ??
          "text-[12.5px] font-medium text-[var(--accent)] hover:underline"
        }
      >
        Remote Control
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remote-control-title"
            className="w-full max-w-[420px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="remote-control-title" className="text-[16px] font-semibold text-[var(--ink)]">
              Remote Control
            </h2>
            <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
              Remote control is coming soon.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={close}
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
