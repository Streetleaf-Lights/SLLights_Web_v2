export interface Stat {
  value: string | number;
  label: string;
}

const SIZE_STYLES = {
  lg: {
    box: "p-5",
    column: "px-4",
    value: "text-[20px] font-semibold leading-tight text-[var(--ink)]",
    label: "mt-1 text-[11px] uppercase tracking-wide text-[var(--ink-faint)]",
  },
  sm: {
    box: "p-2",
    column: "px-2",
    value: "text-[13px] font-semibold leading-tight text-[var(--ink)]",
    label: "mt-0.5 text-[9.5px] uppercase tracking-wide text-[var(--ink-faint)]",
  },
} as const;

export function StatGroup({
  stats,
  size = "lg",
}: {
  stats: Stat[];
  size?: "lg" | "sm";
}) {
  const styles = SIZE_STYLES[size];
  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] ${styles.box}`}
    >
      <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`text-center first:pl-0 last:pr-0 ${styles.column}`}
            aria-label={`${stat.value} ${stat.label}`}
          >
            <div className={styles.value}>{stat.value}</div>
            <div className={styles.label}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
