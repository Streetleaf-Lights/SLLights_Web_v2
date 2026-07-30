import Link from "next/link";
import { StatBox } from "@/components/StatBox";
import { StatGroup } from "@/components/StatGroup";
import { withSearchContext } from "@/lib/url";
import { formatPercent, initials, workingPercentClass } from "@/lib/text";
import type { Customer, CustomerPoleVitals, Project } from "@/lib/types";

/** Combines address, city, state, and zip into one display line, skipping any that are missing. */
export function formatFullAddress(customer: Customer): string | null {
  const cityStateZip = [
    [customer.city, customer.state].filter(Boolean).join(", "),
    customer.zip,
  ]
    .filter(Boolean)
    .join(" ");
  const parts = [customer.address, cityStateZip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * The customer header (avatar/name/address/phone + project count), summary
 * stats, and project list — shared between the customer detail page
 * (/customers/{id}) and the top-level Projects page, which is just this
 * same view scoped to a Customer Admin's own customer, with no drill-down
 * breadcrumb since it's a primary nav destination rather than something
 * reached by searching/browsing.
 */
export function CustomerOverview({
  customer,
  projects,
  vitals,
  custQ,
  poleQ,
}: {
  customer: Customer;
  projects: Project[];
  vitals: CustomerPoleVitals | undefined;
  custQ?: string;
  poleQ?: string;
}) {
  const vitalsByProjectId = new Map(vitals?.projects.map((p) => [p.id, p]));

  const addressLine = formatFullAddress(customer);
  const projectCount = projects.length;
  const totalLights = vitals?.totalLights ?? 0;
  const lightsWorking = vitals ? formatPercent(vitals.optimisticWorkingPercentage) : "—";
  const totalFaults = vitals?.totalFaults ?? "—";

  return (
    <>
      <div className="flex h-[88px] items-center justify-between gap-6 border-b border-t border-[var(--border)] bg-[var(--surface)] px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--accent)] bg-[var(--accent-soft)] text-[21px] font-semibold text-[var(--accent)]">
            {initials(customer.name)}
          </div>
          <div>
            <h1 className="text-[20px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
              {customer.name}
            </h1>
            {addressLine && (
              <p className="mt-0.5 text-[12.5px] text-[var(--ink-muted)]">{addressLine}</p>
            )}
            {customer.phone && (
              <p className="mt-0.5 font-mono-data text-[12.5px] text-[var(--ink-muted)]">
                {customer.phone}
              </p>
            )}
          </div>
        </div>
        <StatBox value={projectCount} label={projectCount === 1 ? "Project" : "Projects"} />
      </div>

      <div className="mx-8 mt-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          Summary
        </div>
        <StatGroup
          stats={[
            { value: totalLights, label: "Total lights" },
            {
              value: lightsWorking,
              label: "Lights working",
              valueClassName: vitals
                ? workingPercentClass(vitals.optimisticWorkingPercentage)
                : undefined,
            },
            { value: totalFaults, label: "Total faults" },
          ]}
        />
      </div>

      <div className="mx-8 mt-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          Projects
        </div>
        {projects.length === 0 ? (
          <p className="text-[12.5px] text-[var(--ink-faint)]">
            No projects on file for this customer yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {projects.map((project) => {
              const projectVitals = vitalsByProjectId.get(project.id);
              return (
                <Link
                  key={project.id}
                  href={withSearchContext(
                    `/customers/${customer.id}/projects/${project.id}`,
                    custQ,
                    poleQ,
                  )}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-sunken)]"
                >
                  <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[var(--ink)] hover:underline">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                      aria-hidden="true"
                    />
                    <span className="truncate">{project.name}</span>
                  </span>
                  <span className="shrink-0">
                    <StatGroup
                      size="sm"
                      stats={[
                        { value: projectVitals?.totalLights ?? "—", label: "Total lights" },
                        {
                          value: projectVitals
                            ? formatPercent(projectVitals.optimisticWorkingPercentage)
                            : "—",
                          label: "Lights working",
                          valueClassName: projectVitals
                            ? workingPercentClass(projectVitals.optimisticWorkingPercentage)
                            : undefined,
                        },
                        { value: projectVitals?.totalFaults ?? "—", label: "Total faults" },
                      ]}
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
