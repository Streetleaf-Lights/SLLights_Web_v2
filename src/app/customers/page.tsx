import { Suspense } from "react";
import { getCustomers } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { CustomersTable } from "@/components/CustomersTable";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <>
      <PageHeader title="Customers" />
      <Suspense>
        <CustomersTable customers={customers} />
      </Suspense>
    </>
  );
}

