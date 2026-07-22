import type { Pole } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export function PolesTable({ poles }: { poles: Pole[] }) {
  return (
    <div className="mx-8 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] table-scroll">
      <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken)] text-[11.5px] uppercase tracking-wide text-[var(--ink-muted)]">
            <th className="py-2.5 pl-4 pr-4 font-medium">Asset tag</th>
            <th className="py-2.5 pr-4 font-medium">Customer</th>
            <th className="py-2.5 pr-4 font-medium">Project</th>
            <th className="py-2.5 pr-4 font-medium">Status</th>
            <th className="py-2.5 pr-4 font-medium">Material</th>
            <th className="py-2.5 pr-4 text-right font-medium">Height</th>
            <th className="py-2.5 pr-4 font-medium">Coordinates</th>
            <th className="py-2.5 pr-8 text-right font-medium">Last inspected</th>
          </tr>
        </thead>
        <tbody>
          {poles.map((pole) => (
            <tr
              key={pole.id}
              className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-sunken)]"
            >
              <td className="py-3 pl-4 pr-4 font-mono-data text-[12px] font-medium text-[var(--ink)]">
                {pole.assetTag}
              </td>
              <td className="py-3 pr-4 text-[var(--ink)]">{pole.customerName}</td>
              <td className="py-3 pr-4 text-[var(--ink-muted)]">{pole.projectName}</td>
              <td className="py-3 pr-4">
                <StatusBadge status={pole.status} />
              </td>
              <td className="py-3 pr-4 text-[var(--ink-muted)]">{pole.material}</td>
              <td className="py-3 pr-4 text-right tabular-nums text-[var(--ink-muted)]">
                {pole.heightFt} ft
              </td>
              <td className="py-3 pr-4 font-mono-data text-[12px] text-[var(--ink-faint)]">
                {pole.latitude.toFixed(4)}, {pole.longitude.toFixed(4)}
              </td>
              <td className="py-3 pr-8 text-right font-mono-data text-[12px] text-[var(--ink-faint)]">
                {pole.lastInspected}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
