"use client";

import { useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { withSearchContext } from "@/lib/url";
import { connectionStatus, isSilentPole } from "@/lib/text";
import type { PoleVital } from "@/lib/types";

const PAGE_SIZE = 10;

/** Same OK/Fault mapping and coloring as the pole detail page's Working Status section. */
function poleStatusLabel(isFault: boolean | null | undefined): {
  text: string;
  className: string;
} {
  if (isFault === null || isFault === undefined) {
    return { text: "—", className: "text-[var(--ink-faint)]" };
  }
  return {
    text: isFault ? "Fault" : "OK",
    className: isFault ? "text-[var(--status-flagged)]" : "text-[var(--status-active)]",
  };
}

/**
 * "Not Reporting" if this pole has never had any update at all (no
 * lastUpdate on record), or — for a customer-scoped viewer — any time it's
 * silent at all (the "48H" distinction is a Streetleaf-only detail).
 * "Not Reporting 48H" otherwise, once it's reported before but hasn't
 * checked in for 48h+ — either way, its last-known light label would
 * otherwise be stale/misleading, so it's not shown.
 */
function lightColumnText(pole: PoleVital, customerScoped: boolean): string {
  if (!pole.lastUpdate) return "Not Reporting";
  if (isSilentPole(pole.lastUpdate)) {
    return customerScoped ? "Not Reporting" : "Not Reporting 48H";
  }
  return pole.lightStatusLabel ?? "—";
}

/**
 * Panel/Battery show a dash for a silent pole — same treatment as a null
 * label — since a stale panelStatusLabel/batteryStatusLabel from before it
 * stopped reporting isn't meaningfully different from having no reading at
 * all. Appends the idle reason in parentheses only when actually Idle,
 * and only for a pole that's still reporting.
 */
function panelColumnText(pole: PoleVital): string {
  if (isSilentPole(pole.lastUpdate)) return "—";
  const label = pole.panelStatusLabel ?? "—";
  if (label === "Idle" && pole.panelIdleReason) {
    return `${label} (${pole.panelIdleReason})`;
  }
  return label;
}

function batteryColumnText(pole: PoleVital): string {
  if (isSilentPole(pole.lastUpdate)) return "—";
  return pole.batteryStatusLabel ?? "—";
}

export function ProjectPolesTable({
  poles,
  customerId,
  projectId,
  custQ,
  poleQ,
  customerScoped = false,
}: {
  poles: PoleVital[];
  customerId: string;
  projectId: string;
  custQ?: string;
  poleQ?: string;
  /**
   * True when the viewer (Customer Admin or "Customer User") is scoped to
   * a single customer — drops "48h Connected" entirely (they're already
   * looking at just their own poles, so it reads as noise) and shortens
   * "48h Overall Status" to "Overall Status".
   */
  customerScoped?: boolean;
}) {
  const [page, setPage] = useState(1);

  if (poles.length === 0) {
    return (
      <p className="text-[12.5px] text-[var(--ink-faint)]">
        No poles on file for this project yet.
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(poles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagePoles = poles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken)] text-[11.5px] uppercase tracking-wide text-[var(--ink-muted)]">
              <th className="py-2.5 pl-4 pr-4 font-medium">Pole Number</th>
              {!customerScoped && (
                <th className="py-2.5 pr-4 font-medium">48h Connected</th>
              )}
              <th className="py-2.5 pr-4 font-medium">
                {customerScoped ? "Overall Status" : "48h Overall Status"}
              </th>
              <th className="py-2.5 pr-4 font-medium">Light</th>
              <th className="py-2.5 pr-4 font-medium">Panel</th>
              <th className="py-2.5 pr-8 font-medium">Battery</th>
            </tr>
          </thead>
          <tbody>
            {pagePoles.map((pole) => {
              const connected = connectionStatus(pole.isOnline, pole.lastUpdate);
              // A disconnected pole's isPoleFault reading is stale — show
              // it as unknown (a dash) rather than a fault status that may
              // no longer reflect reality.
              const status =
                connected.text === "Disconnected"
                  ? poleStatusLabel(null)
                  : poleStatusLabel(pole.isPoleFault);
              return (
                <tr
                  key={pole.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-sunken)]"
                >
                  <td className="py-3 pl-4 pr-4 font-mono-data text-[12px] font-medium">
                    <Link
                      href={withSearchContext(
                        `/customers/${customerId}/projects/${projectId}/poles/${pole.id}`,
                        custQ,
                        poleQ,
                      )}
                      className="text-[var(--ink)] hover:underline"
                    >
                      {pole.poleNumber}
                    </Link>
                  </td>
                  {!customerScoped && (
                    <td className={`py-3 pr-4 font-medium ${connected.className}`}>
                      {connected.text}
                    </td>
                  )}
                  <td className={`py-3 pr-4 font-medium ${status.className}`}>{status.text}</td>
                  <td className="py-3 pr-4">{lightColumnText(pole, customerScoped)}</td>
                  <td className="py-3 pr-4">{panelColumnText(pole)}</td>
                  <td className="py-3 pr-8">{batteryColumnText(pole)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}
