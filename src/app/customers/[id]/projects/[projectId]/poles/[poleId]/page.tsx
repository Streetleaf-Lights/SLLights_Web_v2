import Link from "next/link";
import { getCustomer, getPoleVitalsForCustomer, getProjectsForCustomer } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs, leadingCrumb } from "@/components/Breadcrumbs";
import { OnlineIndicator } from "@/components/OnlineIndicator";
import { StatGroup } from "@/components/StatGroup";
import { PoleMap } from "@/components/PoleMap";
import { PoleVitalsChart } from "@/components/PoleVitalsChart";
import { withQueryParam, withSearchContext } from "@/lib/url";
import { formatPercent, formatTimestamp, isLightStatusWorking, tieredPercentClass } from "@/lib/text";

function formatCoordinate(value: number | null): string {
  return value === null ? "—" : value.toFixed(4);
}

function formatVoltage(value: number | null): string {
  return value === null ? "—" : `${value}V`;
}

export default async function PoleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; projectId: string; poleId: string }>;
  searchParams: Promise<{ cust_q?: string; pole_q?: string }>;
}) {
  const { id, projectId, poleId } = await params;
  const { cust_q, pole_q } = await searchParams;
  const [customer, projects, vitals] = await Promise.all([
    getCustomer(id),
    getProjectsForCustomer(id),
    getPoleVitalsForCustomer(id),
  ]);
  const project = projects.find((p) => p.id === projectId);
  const projectVitals = vitals?.projects.find((p) => p.id === projectId);
  const pole = projectVitals?.poles.find((p) => p.id === poleId);

  const customersHref = withQueryParam("/customers", "cust_q", cust_q);
  const customerHref = customer
    ? withSearchContext(`/customers/${customer.id}`, cust_q, pole_q)
    : customersHref;
  const projectHref =
    customer && project
      ? withSearchContext(`/customers/${customer.id}/projects/${project.id}`, cust_q, pole_q)
      : customerHref;

  if (!customer || !project || !pole) {
    return (
      <>
        <Breadcrumbs
          items={[
            leadingCrumb(cust_q, pole_q),
            ...(customer ? [{ label: customer.name, href: customerHref }] : []),
            ...(customer && project ? [{ label: project.name, href: projectHref }] : []),
          ]}
        />
        <PageHeader title="Pole not found" />
        <p className="px-8 py-6 text-[13px] text-[var(--ink-muted)]">
          We couldn&rsquo;t find a pole with id <code className="font-mono-data">{poleId}</code>.{" "}
          <Link href={projectHref} className="text-[var(--accent-ink)] hover:underline">
            Back to {project ? project.name : customer ? customer.name : "Customers"}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          leadingCrumb(cust_q, pole_q),
          { label: customer.name, href: customerHref },
          { label: project.name, href: projectHref },
        ]}
      />

      <div className="border-b border-t border-[var(--border)] bg-[var(--surface)] px-8 py-5">
        <p className="text-[12.5px] font-medium text-[var(--accent)]">{project.name}</p>
        <h1 className="mt-0.5 font-mono-data text-[20px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
          {pole.poleNumber}
        </h1>
        <div className="mt-3 flex items-start gap-8 text-[12.5px] text-[var(--ink-muted)]">
          <div className="flex flex-col gap-1">
            <span>
              <span className="text-[var(--ink-faint)]">Last Update:</span>{" "}
              {formatTimestamp(pole.lastUpdate)}
            </span>
            <span>
              <span className="text-[var(--ink-faint)]">Install Date:</span>{" "}
              {pole.installDate ?? "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span>
              <span className="text-[var(--ink-faint)]">Lat:</span> {formatCoordinate(pole.lat)}
            </span>
            <span>
              <span className="text-[var(--ink-faint)]">Long:</span> {formatCoordinate(pole.long)}
            </span>
          </div>
          <div>
            <OnlineIndicator isOnline={pole.isOnline} />
          </div>
        </div>
      </div>

      <div className="mx-8 mt-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          System Status
        </div>
        <StatGroup
          stats={[
            {
              value:
                pole.avgPanelPercentage === null ? "—" : formatPercent(pole.avgPanelPercentage),
              label: "Panel Status",
              valueClassName:
                pole.avgPanelPercentage === null
                  ? undefined
                  : tieredPercentClass(pole.avgPanelPercentage),
            },
            {
              value:
                pole.avgBatteryPercentage === null
                  ? "—"
                  : formatPercent(pole.avgBatteryPercentage),
              label: "Battery Status",
              valueClassName:
                pole.avgBatteryPercentage === null
                  ? undefined
                  : tieredPercentClass(pole.avgBatteryPercentage),
            },
            {
              value:
                pole.avgLightPercentage === null ? "—" : formatPercent(pole.avgLightPercentage),
              label: "Light Status",
              valueClassName:
                pole.avgLightPercentage === null
                  ? undefined
                  : isLightStatusWorking(pole.lightStatus)
                    ? "text-[var(--status-active)]"
                    : "text-[var(--status-flagged)]",
            },
          ]}
        />
      </div>

      <div className="mx-8 mb-6 mt-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          Battery Status
        </div>
        <StatGroup
          stats={[
            { value: formatVoltage(pole.batteryVoltage1), label: "Battery Voltage 1" },
            { value: formatVoltage(pole.batteryVoltage2), label: "Battery Voltage 2" },
          ]}
        />
      </div>

      <div className="mx-8 mb-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          Vitals History
        </div>
        <PoleVitalsChart poleId={pole.id} />
      </div>

      <div className="mx-8 mb-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          Location
        </div>
        <PoleMap lat={pole.lat} long={pole.long} />
      </div>
    </>
  );
}
