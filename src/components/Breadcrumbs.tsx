import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 px-8 pt-5 text-[12.5px] text-[var(--ink-faint)]">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const node: ReactNode = item.href ? (
          <Link href={item.href} className="hover:text-[var(--ink)] hover:underline">
            {item.label}
          </Link>
        ) : (
          <span className={isLast ? "text-[var(--ink-muted)]" : undefined}>{item.label}</span>
        );
        return (
          <span key={i} className="flex items-center gap-1.5">
            {node}
            {!isLast && <span aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
