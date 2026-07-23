import { Suspense } from "react";
import { getCustomers } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { CustomersTable } from "@/components/CustomersTable";

// Without this, switching apimFetch to a revalidate-based cache (instead of
// no-store) makes Next.js treat this page as static-eligible and try to
// prerender it at build time — which fails the whole build if the build
// machine can't reach the real APIM endpoint. Force per-request rendering;
// the fetch-level cache in apim.ts still applies at runtime regardless.
export const dynamic = "force-dynamic";

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

