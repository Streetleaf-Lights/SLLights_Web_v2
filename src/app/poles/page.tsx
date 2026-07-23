import { getPoles } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { StubNotice, Toolbar } from "@/components/Toolbar";
import { PolesTable } from "@/components/PolesTable";

const STATUS_FILTERS = ["All", "Active", "Planned", "Flagged", "Decommissioned"] as const;

export default async function PolesPage() {
  const poles = await getPoles();

  return (
    <>
      <PageHeader
        title="Poles"
        description="Every pole across all customers and projects."
      />
      <Toolbar
        searchPlaceholder="Search by asset tag…"
        resultCount={`${poles.length} poles`}
      >
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((status, i) => (
            <button
              key={status}
              type="button"
              disabled
              className={`cursor-not-allowed rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                i === 0
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </Toolbar>
      <StubNotice>
        This page renders stubbed data. Once the APIM route is live, swap{" "}
        <code className="font-mono-data">getPoles()</code> in{" "}
        <code className="font-mono-data">src/lib/apim.ts</code> for a real request, and wire up
        the status filters and search above.
      </StubNotice>
      <PolesTable poles={poles} />
    </>
  );
}
