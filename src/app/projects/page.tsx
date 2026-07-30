import { getCustomer, getPoleVitalsForCustomer, getProjectsForCustomer } from "@/lib/apim";
import { getSessionUser } from "@/lib/session";
import { CustomerOverview } from "@/components/CustomerOverview";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const sessionUser = await getSessionUser();
  const customerId = sessionUser?.customerId;
  const customer = customerId ? await getCustomer(customerId) : undefined;

  if (!customer) {
    return (
      <p className="px-8 py-6 text-[13px] text-[var(--ink-muted)]">
        We couldn&rsquo;t find a customer associated with your account.
      </p>
    );
  }

  const [projects, vitals] = await Promise.all([
    getProjectsForCustomer(customer.id),
    getPoleVitalsForCustomer(customer.id),
  ]);

  return <CustomerOverview customer={customer} projects={projects} vitals={vitals} />;
}
