"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/customers", label: "Customers", hint: "Accounts & projects" },
  { href: "/poles", label: "Poles", hint: "Asset inventory" },
  { href: "/users", label: "Users", hint: "Access & roles" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
      <div className="flex h-[88px] items-center border-b border-[var(--sidebar-border)] px-4">
        <Image
          src="/brand/streetleaf-logo.png"
          alt="Streetleaf"
          width={298}
          height={52}
          className="h-auto w-full"
          priority
        />
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex flex-col gap-0.5 rounded-md px-3 py-2.5 transition-colors ${
                isActive
                  ? "bg-[var(--sidebar-bg-active)]"
                  : "hover:bg-[var(--sidebar-bg-active)]/60"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[var(--accent)]" />
              )}
              <span
                className={`text-[13.5px] font-medium ${
                  isActive ? "text-[var(--sidebar-ink-active)]" : "text-[var(--sidebar-ink)]"
                }`}
              >
                {item.label}
              </span>
              <span className="text-[11px] text-[var(--sidebar-ink)] opacity-70">
                {item.hint}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] px-5 py-4">
        <div className="text-[11px] leading-relaxed text-[var(--sidebar-ink)] opacity-60">
          Data sourced from Azure APIM
          <br />
          Environment: stub
        </div>
      </div>
    </aside>
  );
}
