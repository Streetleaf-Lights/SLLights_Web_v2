import { Suspense } from "react";
import { getPoles } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { PolesTable } from "@/components/PolesTable";

export const dynamic = "force-dynamic";

export default async function PolesPage() {
  const poles = await getPoles();

  return (
    <>
      <PageHeader
        title="Poles"
        description="Every pole across all customers and projects."
      />
      <Suspense>
        <PolesTable poles={poles} />
      </Suspense>
    </>
  );
}
