import Link from "next/link";
import type { ReactNode } from "react";
import { withQueryParam } from "@/lib/url";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * The leading "Customers" breadcrumb, used by the customer/project detail
 * pages. When arriving via an active search (?cust_q=...), it swaps the
 * label to "Customer Search: …" so the trail reflects where you came from,
 * while the href still returns to that same filtered list.
 */
export function customersCrumb(custQ?: string): Crumb {
  return {
    label: custQ ? `Customer Search: \u201c${custQ}\u201d` : "Customers",
    href: withQueryParam("/customers", "cust_q", custQ),
  };
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 px-8 pt-5 text-[12.5px] text-[var(--ink-faint)]">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const node: ReactNode = item.href ? (
          <Link href={item.href} className="hover:text-[var(--accent)] hover:underline">
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
