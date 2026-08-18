"use client";

import { useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { withSearchContext } from "@/lib/url";
import { connectionStatus } from "@/lib/text";
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

export function ProjectPolesTable({
  poles,
  customerId,
  projectId,
  custQ,
  poleQ,
}: {
  poles: PoleVital[];
  customerId: string;
  projectId: string;
  custQ?: string;
  poleQ?: string;
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
              <th className="py-2.5 pr-4 font-medium">48h Connected</th>
              <th className="py-2.5 pr-8 font-medium">48h Overall Status</th>
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
                  <td className={`py-3 pr-4 font-medium ${connected.className}`}>
                    {connected.text}
                  </td>
                  <td className={`py-3 pr-8 font-medium ${status.className}`}>{status.text}</td>
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
