"use client";

import { useEffect, useState } from "react";
import { isLampOn } from "@/lib/leadsun";
import type { LeadsunLampStatus, LeadsunProduct, LeadsunProject } from "@/lib/types";

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * The "cool indicator" — a small glowing bulb next to a pole's name. Amber
 * with a soft glow when on (echoing an actual lit streetlight), a plain
 * gray dot when off, and a pulsing neutral dot while status is still
 * loading. Color is never the only signal — the ON/OFF/… text label is
 * always there too.
 */
function LampIndicator({ status }: { status: "loading" | "on" | "off" | "unknown" }) {
  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--ink-faint)]">
        <span
          className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--ink-faint)]"
          aria-hidden="true"
        />
        …
      </span>
    );
  }
  if (status === "unknown") {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--ink-faint)]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--ink-faint)]" aria-hidden="true" />
        —
      </span>
    );
  }
  const isOn = status === "on";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
        isOn ? "bg-[#fef3c7] text-[#92400e]" : "bg-[var(--surface-sunken)] text-[var(--ink-faint)]"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          isOn
            ? "bg-[#f59e0b] shadow-[0_0_8px_2px_rgba(245,158,11,0.65)]"
            : "bg-[var(--ink-faint)]"
        }`}
        aria-hidden="true"
      />
      {isOn ? "ON" : "OFF"}
    </span>
  );
}

/** Loading/on/off/unknown status for one ProductId, given the fetched status map. */
function lampStatusFor(
  lampStatusById: Record<string, LeadsunLampStatus> | null,
  hasError: boolean,
  productId: string,
): "loading" | "on" | "off" | "unknown" {
  if (hasError) return "unknown";
  if (lampStatusById === null) return "loading";
  const lamp = lampStatusById[productId];
  if (!lamp) return "unknown";
  return isLampOn(lamp) ? "on" : "off";
}

/** Shown when opened from a project (or a pole row within a project's pole list) with no single pole in context — the full gateway/pole breakdown. */
function ProjectRemoteControlContent({
  leadsunProject,
  lampStatusById,
  errorDetail,
}: {
  leadsunProject: LeadsunProject;
  lampStatusById: Record<string, LeadsunLampStatus> | null;
  errorDetail: string | null;
}) {
  return (
    <>
      <h2 id="remote-control-title" className="text-[16px] font-semibold text-[var(--ink)]">
        {leadsunProject.ProjectName}
      </h2>
      <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
        {pluralize(leadsunProject.totalGateways, "Gateway", "Gateways")} ·{" "}
        {pluralize(leadsunProject.totalPoles, "Light", "Lights")}
      </p>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {leadsunProject.groups.map((group) => (
          <div
            key={group.GroupId}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-3"
          >
            <p className="text-[13px] font-semibold text-[var(--ink)]">{group.GroupName}</p>
            <p className="mt-0.5 font-mono-data text-[11px] text-[var(--ink-faint)]">
              {group.GatewayCode}
            </p>
            <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">
              {pluralize(group.totalPoles, "Light", "Lights")}
            </p>
            <div className="mt-2 flex flex-col gap-2 border-t border-[var(--border)] pt-2">
              {group.products.map((product) => (
                <div key={product.ProductId} className="text-[11.5px]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[var(--ink)]">{product.ProductName}</p>
                    <LampIndicator
                      status={lampStatusFor(
                        lampStatusById,
                        errorDetail !== null,
                        String(product.ProductId),
                      )}
                    />
                  </div>
                  <p className="font-mono-data text-[var(--ink-faint)]">
                    {product.ProvidedProductId}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {errorDetail !== null && (
        <p className="mt-3 text-[11.5px] text-[var(--status-flagged)]">
          Couldn&rsquo;t load live ON/OFF status. ({errorDetail})
        </p>
      )}
      <p className="mt-5 text-[12.5px] text-[var(--ink-muted)]">
        Remote control actions are coming soon.
      </p>
    </>
  );
}

/** Shown when opened from a single pole (project's pole list row, or the pole detail page) — just that pole's own product. */
function PoleRemoteControlContent({
  product,
  lampStatusById,
  errorDetail,
}: {
  product: LeadsunProduct;
  lampStatusById: Record<string, LeadsunLampStatus> | null;
  errorDetail: string | null;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 id="remote-control-title" className="text-[16px] font-semibold text-[var(--ink)]">
          {product.ProductName}
        </h2>
        <LampIndicator
          status={lampStatusFor(lampStatusById, errorDetail !== null, String(product.ProductId))}
        />
      </div>
      <p className="mt-1 font-mono-data text-[13px] text-[var(--ink-muted)]">
        {product.ProvidedProductId}
      </p>
      {errorDetail !== null && (
        <p className="mt-3 text-[11.5px] text-[var(--status-flagged)]">
          Couldn&rsquo;t load live ON/OFF status. ({errorDetail})
        </p>
      )}
      <p className="mt-5 text-[12.5px] text-[var(--ink-muted)]">
        Remote control actions are coming soon.
      </p>
    </>
  );
}

type RemoteControlLinkProps = {
  className?: string;
  leadsunProject: LeadsunProject;
} & ({ product?: undefined } | { product: LeadsunProduct });

/**
 * A "Remote Control" link that opens a modal showing the relevant Leadsun
 * gateway/pole info, plus each pole's live ON/OFF status — from a project,
 * the full gateway/pole breakdown; from a single pole, just that pole's
 * own product. Live status is fetched fresh each time the modal opens
 * (not cached), from GET /api/leadsunlampstatus, which proxies to
 * Leadsun's own status API server-side (it requires a client TLS
 * certificate the browser can't present itself). Real remote control
 * actions (on/off, brightness, etc.) aren't wired up yet, this just
 * establishes where the entry point lives on each page.
 */
export function RemoteControlLink({
  className,
  leadsunProject,
  product,
}: RemoteControlLinkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lampStatusById, setLampStatusById] = useState<Record<string, LeadsunLampStatus> | null>(
    null,
  );
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const productId = product?.ProductId;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    // Resetting to "loading" at the start of a fetch effect is React's own
    // documented pattern (react.dev/learn/synchronizing-with-effects —
    // "Fetching data"), so the modal doesn't briefly show the previous
    // pole/project's stale status before this fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLampStatusById(null);
    setErrorDetail(null);

    const query = new URLSearchParams({ projectId: leadsunProject.ProjectId });
    if (productId !== undefined) query.set("productId", String(productId));

    fetch(`/api/leadsunlampstatus?${query.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.detail || body?.error || `request failed (${res.status})`);
        }
        return res.json();
      })
      .then((lamps: LeadsunLampStatus[]) => {
        if (cancelled) return;
        setLampStatusById(Object.fromEntries(lamps.map((lamp) => [lamp.productId, lamp])));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorDetail(err instanceof Error ? err.message : "unknown error");
        setLampStatusById({});
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, leadsunProject.ProjectId, productId]);

  function close() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ??
          "text-[12.5px] font-medium text-[var(--accent)] hover:underline"
        }
      >
        Remote Control
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remote-control-title"
            className={`w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg ${
              product ? "max-w-[420px]" : "max-w-4xl max-h-[85vh] overflow-y-auto"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {product ? (
              <PoleRemoteControlContent
                product={product}
                lampStatusById={lampStatusById}
                errorDetail={errorDetail}
              />
            ) : (
              <ProjectRemoteControlContent
                leadsunProject={leadsunProject}
                lampStatusById={lampStatusById}
                errorDetail={errorDetail}
              />
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-[var(--border)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-sunken)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
