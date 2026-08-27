"use client";

import { useState } from "react";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { withSearchContext } from "@/lib/url";
import {
  connectionStatus,
  poleOverallStatus,
  lightColumnText,
  panelColumnText,
  batteryColumnText,
} from "@/lib/text";
import type { PoleVital } from "@/lib/types";

const PAGE_SIZE = 10;

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
              const status = poleOverallStatus(pole);
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
                      className="flex items-center gap-2 text-[var(--ink)] hover:underline"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          pole.isOnline === null
                            ? "bg-[var(--ink-faint)]"
                            : pole.isOnline
                              ? "bg-[var(--status-active)]"
                              : "bg-[var(--status-flagged)]"
                        }`}
                        aria-hidden="true"
                      />
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
