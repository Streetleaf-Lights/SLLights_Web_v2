import Link from "next/link";
import { getCustomer, getPoleVitalsForCustomer, getProjectsForCustomer } from "@/lib/apim";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumbs, leadingCrumb } from "@/components/Breadcrumbs";
import { PoleMap } from "@/components/PoleMap";
import { PoleVitalsChart } from "@/components/PoleVitalsChart";
import { withQueryParam, withSearchContext } from "@/lib/url";
import { formatPercent, formatTimestamp } from "@/lib/text";

function formatCoordinate(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}

function formatVoltage(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value}V`;
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : String(value);
}

/** Green "okLabel" when false, red "faultLabel" when true, neutral dash when null/undefined. */
function faultStatus(
  isFault: boolean | null | undefined,
  okLabel: string,
  faultLabel: string,
): { text: string; className: string } {
  if (isFault === null || isFault === undefined) {
    return { text: "—", className: "text-[var(--ink-faint)]" };
  }
  return {
    text: isFault ? faultLabel : okLabel,
    className: isFault ? "text-[var(--status-flagged)]" : "text-[var(--status-active)]",
  };
}

/** Green "Online" when true, red "Offline" when false, neutral dash when null/undefined. */
function connectionStatus(isOnline: boolean | null | undefined): {
  text: string;
  className: string;
} {
  if (isOnline === null || isOnline === undefined) {
    return { text: "—", className: "text-[var(--ink-faint)]" };
  }
  return {
    text: isOnline ? "Online" : "Offline",
    className: isOnline ? "text-[var(--status-active)]" : "text-[var(--status-flagged)]",
  };
}

function StatusBox({
  title,
  status,
  metrics,
}: {
  title: string;
  status: { text: string; className: string };
  metrics: { label: string; value: string }[];
}) {
  return (
    <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-[var(--ink)]">{title}</span>
        <span className={`text-[13px] font-semibold ${status.className}`}>{status.text}</span>
      </div>
      {metrics.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="text-[var(--ink-faint)]">{metric.label}</span>
              <span className="font-mono-data text-[var(--ink)]">{metric.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

  const connected = connectionStatus(pole.isOnline);
  const overallStatus = faultStatus(pole.isPoleFault, "OK", "Fault");

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
          <div className="flex flex-col gap-1">
            <span>
              <span className="text-[var(--ink-faint)]">48h Connected:</span>{" "}
              <span className={connected.className}>{connected.text}</span>
            </span>
            <span>
              <span className="text-[var(--ink-faint)]">48h Overall Status:</span>{" "}
              <span className={overallStatus.className}>{overallStatus.text}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mx-8 mb-6 mt-6">
        <div className="mb-3 text-[11px] uppercase tracking-wide text-[var(--ink-muted)]">
          Statuses
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <StatusBox
            title="Light"
            status={faultStatus(pole.isLedFault, "OK", "Fault")}
            metrics={[
              { label: "48h Average Light %", value: formatPercent(pole.avgLightPercentage) },
              { label: "Latest Light Power 1", value: formatNumber(pole.lampPower1) },
              { label: "Latest Light Power 2", value: formatNumber(pole.lampPower2) },
            ]}
          />
          <StatusBox
            title="Panel"
            status={faultStatus(pole.isPanelFault, "OK", "Fault")}
            metrics={[
              { label: "48h Average Panel %", value: formatPercent(pole.avgPanelPercentage) },
              { label: "Latest Panel Voltage", value: formatVoltage(pole.solarBoardVoltage) },
              {
                label: "Latest Panel Electric Current",
                value: formatNumber(pole.solarBoardElecCurrent),
              },
            ]}
          />
          <StatusBox
            title="Battery"
            status={faultStatus(pole.isBatteryFault, "OK", "Fault")}
            metrics={[
              { label: "48h Average Battery %", value: formatPercent(pole.avgBatteryPercentage) },
              {
                label: "Latest Electric Current 1",
                value: formatNumber(pole.batteryElecCurrent1),
              },
              {
                label: "Latest Electric Current 2",
                value: formatNumber(pole.batteryElecCurrent2),
              },
              { label: "Latest Battery Voltage 1", value: formatVoltage(pole.batteryVoltage1) },
              { label: "Latest Battery Voltage 2", value: formatVoltage(pole.batteryVoltage2) },
              {
                label: "Minimum Charging Voltage",
                value: formatVoltage(pole.batteryChargingMin),
              },
            ]}
          />
          <StatusBox
            title="Issue"
            status={faultStatus(pole.isOpenIssueFault, "No Issue", "Open Issue")}
            metrics={[]}
          />
        </div>
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
