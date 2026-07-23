import Link from "next/link";
import { getCustomer } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs, customersCrumb } from "@/components/Breadcrumbs";
import { withQueryParam } from "@/lib/url";

function formatLocation(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`;
  if (state) return state;
  if (city) return city;
  return "—";
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cust_q?: string }>;
}) {
  const { id } = await params;
  const { cust_q } = await searchParams;
  const customer = await getCustomer(id);
  const customersHref = withQueryParam("/customers", "cust_q", cust_q);

  if (!customer) {
    return (
      <>
        <Breadcrumbs items={[customersCrumb(cust_q)]} />
        <PageHeader title="Customer not found" />
        <p className="px-8 py-6 text-[13px] text-[var(--ink-muted)]">
          We couldn&rsquo;t find a customer with id{" "}
          <code className="font-mono-data">{id}</code>.{" "}
          <Link href={customersHref} className="text-[var(--accent-ink)] hover:underline">
            Back to Customers
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs items={[customersCrumb(cust_q)]} />
      <PageHeader title={customer.name} />

      <div className="mx-8 mb-6 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[12.5px] text-[var(--ink-muted)]">
        This is a stub detail page. Additional customer fields, activity, and actions will go
        here.
      </div>

      <div className="mx-8 grid grid-cols-2 gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-[13px] sm:grid-cols-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
            Location
          </div>
          <div className="mt-1 text-[var(--ink)]">
            {formatLocation(customer.city, customer.state)}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
            Phone
          </div>
          <div className="mt-1 font-mono-data text-[var(--ink)]">{customer.phone ?? "—"}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
            Address
          </div>
          <div className="mt-1 text-[var(--ink)]">{customer.address ?? "—"}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
            Customer ID
          </div>
          <div className="mt-1 font-mono-data text-[12px] text-[var(--ink-faint)]">
            {customer.id}
          </div>
        </div>
      </div>

      <div className="mx-8 mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">
          Projects
        </div>
        {customer.projects.length === 0 ? (
          <p className="text-[12.5px] text-[var(--ink-faint)]">
            No projects on file for this customer yet.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {customer.projects.map((project) => (
              <Link
                key={project.id}
                href={withQueryParam(
                  `/customers/${customer.id}/projects/${project.id}`,
                  "cust_q",
                  cust_q,
                )}
                className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-sunken)]"
              >
                <span className="text-[13px] font-medium text-[var(--ink)] hover:underline">
                  {project.name}
                </span>
                <span className="font-mono-data text-[11.5px] text-[var(--ink-faint)]">
                  {project.id}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
