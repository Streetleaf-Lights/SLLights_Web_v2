"use client";

import { Fragment, useState } from "react";
import type { Customer, Project } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 text-[var(--ink-faint)] transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CustomersTable({
  customers,
  projectsByCustomer,
}: {
  customers: Customer[];
  projectsByCustomer: Record<string, Project[]>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mx-8 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken)] text-[11.5px] uppercase tracking-wide text-[var(--ink-muted)]">
            <th className="w-8 py-2.5 pl-4"></th>
            <th className="py-2.5 pr-4 font-medium">Customer</th>
            <th className="py-2.5 pr-4 font-medium">Account code</th>
            <th className="py-2.5 pr-4 font-medium">Region</th>
            <th className="py-2.5 pr-4 font-medium">Status</th>
            <th className="py-2.5 pr-4 text-right font-medium">Projects</th>
            <th className="py-2.5 pr-4 text-right font-medium">Poles</th>
            <th className="py-2.5 pr-8 text-right font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const isOpen = expanded === customer.id;
            const projects = projectsByCustomer[customer.id] ?? [];
            return (
              <Fragment key={customer.id}>
                <tr
                  onClick={() => setExpanded(isOpen ? null : customer.id)}
                  className="cursor-pointer border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-sunken)]"
                >
                  <td className="pl-4">
                    <ChevronIcon open={isOpen} />
                  </td>
                  <td className="py-3 pr-4 font-medium text-[var(--ink)]">{customer.name}</td>
                  <td className="py-3 pr-4 font-mono-data text-[12px] text-[var(--ink-muted)]">
                    {customer.accountCode}
                  </td>
                  <td className="py-3 pr-4 text-[var(--ink-muted)]">{customer.region}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={customer.status} />
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-[var(--ink-muted)]">
                    {customer.projectCount}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-[var(--ink-muted)]">
                    {customer.poleCount}
                  </td>
                  <td className="py-3 pr-8 text-right font-mono-data text-[12px] text-[var(--ink-faint)]">
                    {customer.updatedAt}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken)]/60">
                    <td colSpan={8} className="px-4 py-3 pl-12">
                      {projects.length === 0 ? (
                        <p className="text-[12.5px] text-[var(--ink-faint)]">
                          No projects on file for this customer yet.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
                            Projects
                          </div>
                          {projects.map((project) => (
                            <div
                              key={project.id}
                              className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                            >
                              <div className="flex items-baseline gap-2.5">
                                <span className="text-[13px] font-medium text-[var(--ink)]">
                                  {project.name}
                                </span>
                                <span className="font-mono-data text-[11.5px] text-[var(--ink-faint)]">
                                  {project.code}
                                </span>
                              </div>
                              <span className="text-[12px] text-[var(--ink-muted)]">
                                {project.poleCount} poles
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
