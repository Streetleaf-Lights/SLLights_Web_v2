import Link from "next/link";
import { getCustomer, getPoleVitalsForCustomer, getProjectsForCustomer } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs, leadingCrumb } from "@/components/Breadcrumbs";
import { StatGroup } from "@/components/StatGroup";
import { ProjectPolesTable } from "@/components/ProjectPolesTable";
import { LocationMap } from "@/components/LocationMap";
import { withQueryParam, withSearchContext } from "@/lib/url";
import { formatPercent, workingPercentClass } from "@/lib/text";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; projectId: string }>;
  searchParams: Promise<{ cust_q?: string; pole_q?: string }>;
}) {
  const { id, projectId } = await params;
  const { cust_q, pole_q } = await searchParams;
  const [customer, projects, vitals] = await Promise.all([
    getCustomer(id),
    getProjectsForCustomer(id),
    getPoleVitalsForCustomer(id),
  ]);
  const project = projects.find((p) => p.id === projectId);
  const projectVitals = vitals?.projects.find((p) => p.id === projectId);

  const customersHref = withQueryParam("/customers", "cust_q", cust_q);
  const customerHref = customer
    ? withSearchContext(`/customers/${customer.id}`, cust_q, pole_q)
    : customersHref;

  if (!customer || !project) {
    return (
      <>
        <Breadcrumbs
          items={[
            leadingCrumb(cust_q, pole_q),
            ...(customer ? [{ label: customer.name, href: customerHref }] : []),
          ]}
        />
        <PageHeader title="Project not found" />
        <p className="px-8 py-6 text-[13px] text-[var(--ink-muted)]">
          We couldn&rsquo;t find a project with id{" "}
          <code className="font-mono-data">{projectId}</code>.{" "}
          <Link href={customerHref} className="text-[var(--accent-ink)] hover:underline">
            Back to {customer ? customer.name : "Customers"}
          </Link>
        </p>
      </>
    );
  }

  const totalLights = projectVitals?.totalLights ?? "—";
  const lightsWorking = projectVitals
    ? formatPercent(projectVitals.optimisticWorkingPercentage)
    : "—";
  const totalFaults = projectVitals?.totalFaults ?? "—";

  return (
    <>
      <Breadcrumbs
        items={[leadingCrumb(cust_q, pole_q), { label: customer.name, href: customerHref }]}
      />

      <div className="flex h-[88px] flex-col justify-center border-b border-t border-[var(--border)] bg-[var(--surface)] px-8">
        <p className="text-[12.5px] font-medium text-[var(--accent)]">{customer.name}</p>
        <h1 className="text-[20px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
          {project.name}
        </h1>
      </div>

      <div className="mx-8 mt-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          Light Status
        </div>
        <StatGroup
          stats={[
            { value: totalLights, label: "Total lights" },
            {
              value: lightsWorking,
              label: "Lights working",
              valueClassName: projectVitals
                ? workingPercentClass(projectVitals.optimisticWorkingPercentage)
                : undefined,
            },
            { value: totalFaults, label: "Total faults" },
          ]}
        />
      </div>

      <div className="mx-8 mt-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          Location
        </div>
        <LocationMap
          points={(projectVitals?.poles ?? [])
            .filter((pole) => pole.lat !== null && pole.long !== null)
            .map((pole) => ({ lat: pole.lat as number, long: pole.long as number, label: pole.poleNumber }))}
          emptyMessage="No poles have location data for this project."
        />
      </div>

      <div className="mx-8 mb-6 mt-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          Poles
        </div>
        <ProjectPolesTable
          poles={projectVitals?.poles ?? []}
          customerId={customer.id}
          projectId={project.id}
          custQ={cust_q}
          poleQ={pole_q}
        />
      </div>
    </>
  );
}
