import { Suspense } from "react";
import { getPoles } from "@/lib/apim";
import { getSessionUser } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { PolesTable } from "@/components/PolesTable";

export const dynamic = "force-dynamic";

export default async function PolesPage() {
  const sessionUser = await getSessionUser();
  const isCustomerAdmin = sessionUser?.role === "Customer Admin";

  const poles = await getPoles(
    isCustomerAdmin && sessionUser?.customerId
      ? { customerId: sessionUser.customerId }
      : undefined,
  );

  return (
    <>
      <PageHeader
        title="Poles"
        description={
          isCustomerAdmin
            ? "Every pole for your customer."
            : "Every pole across all customers and projects."
        }
      />
      <Suspense>
        <PolesTable poles={poles} />
      </Suspense>
    </>
  );
}
