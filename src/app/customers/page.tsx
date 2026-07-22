import { getCustomers, getProjectsForCustomer } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton, StubNotice, Toolbar } from "@/components/Toolbar";
import { CustomersTable } from "@/components/CustomersTable";
import type { Project } from "@/lib/types";

export default async function CustomersPage() {
  const customers = await getCustomers();

  const projectLists = await Promise.all(
    customers.map((c) => getProjectsForCustomer(c.id)),
  );
  const projectsByCustomer = customers.reduce<Record<string, Project[]>>(
    (acc, customer, i) => {
      acc[customer.id] = projectLists[i];
      return acc;
    },
    {},
  );

  return (
    <>
      <PageHeader
        title="Customers"
        description="Accounts at the top of the hierarchy. Expand a row to see its projects."
        actions={<PrimaryButton>Add customer</PrimaryButton>}
      />
      <Toolbar
        searchPlaceholder="Search customers…"
        resultCount={`${customers.length} customers`}
      />
      <StubNotice>
        This page renders stubbed data. Once the APIM route is live, swap{" "}
        <code className="font-mono-data">getCustomers()</code> in{" "}
        <code className="font-mono-data">src/lib/apim.ts</code> for a real request.
      </StubNotice>
      <CustomersTable customers={customers} projectsByCustomer={projectsByCustomer} />
    </>
  );
}
