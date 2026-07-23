import Link from "next/link";
import { getCustomer, getProjectsForCustomer } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs, customersCrumb } from "@/components/Breadcrumbs";
import { StatGroup } from "@/components/StatGroup";
import { withQueryParam } from "@/lib/url";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; projectId: string }>;
  searchParams: Promise<{ cust_q?: string }>;
}) {
  const { id, projectId } = await params;
  const { cust_q } = await searchParams;
  const [customer, projects] = await Promise.all([
    getCustomer(id),
    getProjectsForCustomer(id),
  ]);
  const project = projects.find((p) => p.id === projectId);

  const customersHref = withQueryParam("/customers", "cust_q", cust_q);
  const customerHref = customer
    ? withQueryParam(`/customers/${customer.id}`, "cust_q", cust_q)
    : customersHref;

  if (!customer || !project) {
    return (
      <>
        <Breadcrumbs
          items={[
            customersCrumb(cust_q),
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

  // TODO: wire up once the API exposes real "lights working" / "total
  // faults" figures per project — no such fields exist on /getProjects yet.
  const lightsWorking = "—";
  const totalFaults = "—";

  return (
    <>
      <Breadcrumbs
        items={[customersCrumb(cust_q), { label: customer.name, href: customerHref }]}
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
            { value: project.polesUnderContract, label: "Total lights" },
            { value: lightsWorking, label: "Lights working" },
            { value: totalFaults, label: "Total faults" },
          ]}
        />
      </div>
    </>
  );
}
