"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Toolbar } from "@/components/Toolbar";
import { Pagination } from "@/components/Pagination";
import { StatGroup } from "@/components/StatGroup";
import { formatPercent, connectionStatus } from "@/lib/text";
import { withQueryParam } from "@/lib/url";
import type { PoleSummary } from "@/lib/types";

const PAGE_SIZE = 10;

function formatCoordinate(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}

export function PolesTable({ poles }: { poles: PoleSummary[] }) {
  const searchParams = useSearchParams();
  const poleQ = searchParams.get("pole_q") ?? "";
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(poleQ);
  const [prevPoleQ, setPrevPoleQ] = useState(poleQ);

  // Same render-time state-adjustment pattern used in CustomersTable — see
  // the comment there for why this can't just be a useState initializer.
  if (poleQ !== prevPoleQ) {
    setPrevPoleQ(poleQ);
    setQuery(poleQ);
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return poles;
    return poles.filter((pole) => pole.poleNumber.toLowerCase().includes(q));
  }, [poles, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagePoles = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleQueryChange(next: string) {
    setQuery(next);
    setPage(1);
  }

  return (
    <>
      <Toolbar
        searchPlaceholder="Search by pole number…"
        resultCount={`${filtered.length} ${filtered.length === 1 ? "pole" : "poles"}`}
        value={query}
        onChange={handleQueryChange}
      />
      {filtered.length === 0 ? (
        <p className="mx-8 text-[12.5px] text-[var(--ink-faint)]">
          {poles.length === 0 ? "No poles on file yet." : "No poles match your search."}
        </p>
      ) : (
        <>
          <div className="mx-8 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] table-scroll">
            <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken)] text-[11.5px] uppercase tracking-wide text-[var(--ink-muted)]">
                  <th className="py-2.5 pl-4 pr-4 font-medium">Pole</th>
                  <th className="py-2.5 pr-4 font-medium">48h Connected</th>
                  <th className="py-2.5 pr-8 font-medium">Statuses</th>
                </tr>
              </thead>
              <tbody>
                {pagePoles.map((pole) => {
                  const connected = connectionStatus(pole.isOnline, pole.lastUpdate);
                  const panel =
                    pole.avgPanelPercentage === null ? "—" : formatPercent(pole.avgPanelPercentage);
                  const battery =
                    pole.avgBatteryPercentage === null
                      ? "—"
                      : formatPercent(pole.avgBatteryPercentage);
                  const light =
                    pole.avgLightPercentage === null ? "—" : formatPercent(pole.avgLightPercentage);
                  return (
                    <tr
                      key={pole.id}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-sunken)]"
                    >
                      <td className="py-3 pl-4 pr-4">
                        <Link
                          href={withQueryParam(
                            `/customers/${pole.customerId}/projects/${pole.projectId}/poles/${pole.id}`,
                            "pole_q",
                            query,
                          )}
                          className="flex items-center gap-2 font-mono-data text-[12px] font-medium text-[var(--ink)] hover:underline"
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
                        <div className="mt-1 text-[11.5px] text-[var(--ink-faint)]">
                          Installed: {pole.installDate ?? "—"}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-[12.5px]">
                        <span className={connected.className}>{connected.text}</span>
                        <div className="mt-1 font-mono-data text-[11.5px] text-[var(--ink-faint)]">
                          {formatCoordinate(pole.lat)}, {formatCoordinate(pole.long)}
                        </div>
                      </td>
                      <td className="py-3 pr-8">
                        <StatGroup
                          size="sm"
                          stats={[
                            { value: panel, label: "Panel" },
                            { value: battery, label: "Battery" },
                            { value: light, label: "Light" },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
