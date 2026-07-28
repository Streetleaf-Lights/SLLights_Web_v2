import Link from "next/link";
import type { ReactNode } from "react";
import { withQueryParam } from "@/lib/url";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * The leading "Customers" breadcrumb, used by the customer/project/pole
 * detail pages. When arriving via an active search (?cust_q=...), the label
 * shows "Customer Search: …" and clicking it restores that same filtered
 * list — the label promises a specific search, so the link should actually
 * go there. (The sidebar's plain "Customers" link is separate and always
 * goes to the unfiltered list, since it never carries a query in the first
 * place — only this breadcrumb, which explicitly names the search you're
 * in, restores it.)
 */
export function customersCrumb(custQ?: string): Crumb {
  const label = custQ ? `Customer Search: \u201c${custQ}\u201d` : "Customers";
  return {
    label: `\u2190 ${label}`,
    href: withQueryParam("/customers", "cust_q", custQ),
  };
}

/**
 * The leading "Poles" breadcrumb — same restore behavior as customersCrumb,
 * but for arriving at a customer/project/pole detail page via a search on
 * the system-wide Poles list instead.
 */
export function polesCrumb(poleQ?: string): Crumb {
  const label = poleQ ? `Pole Search: \u201c${poleQ}\u201d` : "Poles";
  return {
    label: `\u2190 ${label}`,
    href: withQueryParam("/poles", "pole_q", poleQ),
  };
}

/**
 * Picks the leading breadcrumb crumb based on which search (if either) led
 * to this page: a pole search takes priority over a customer search, since
 * it's the more specific/recent context when both happen to be present.
 */
export function leadingCrumb(custQ?: string, poleQ?: string): Crumb {
  return poleQ ? polesCrumb(poleQ) : customersCrumb(custQ);
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 px-8 pb-3 pt-5 text-[12.5px] text-[var(--ink-faint)]">
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
