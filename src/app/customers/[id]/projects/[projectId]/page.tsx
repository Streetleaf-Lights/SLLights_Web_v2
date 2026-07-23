import Link from "next/link";
import { getCustomer } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs, customersCrumb } from "@/components/Breadcrumbs";
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
  const customer = await getCustomer(id);
  const project = customer?.projects.find((p) => p.id === projectId);

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

  return (
    <>
      <Breadcrumbs
        items={[customersCrumb(cust_q), { label: customer.name, href: customerHref }]}
      />
      <PageHeader title={project.name} />

      <div className="mx-8 mb-6 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[12.5px] text-[var(--ink-muted)]">
        This is a stub detail page. Poles, timeline, and status for this project will go here.
      </div>

      <div className="mx-8 grid grid-cols-2 gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-[13px] sm:grid-cols-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
            Customer
          </div>
          <div className="mt-1">
            <Link href={customerHref} className="text-[var(--ink)] hover:underline">
              {customer.name}
            </Link>
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
            Project ID
          </div>
          <div className="mt-1 font-mono-data text-[12px] text-[var(--ink-faint)]">
            {project.id}
          </div>
        </div>
      </div>
    </>
  );
}
