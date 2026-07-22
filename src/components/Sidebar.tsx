"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/customers", label: "Customers", hint: "Accounts & projects" },
  { href: "/poles", label: "Poles", hint: "Asset inventory" },
  { href: "/users", label: "Users", hint: "Access & roles" },
] as const;

function PoleMark() {
  // Signature glyph: a utility pole with a crossarm and two spanning wires.
  // Doubles as the nav's "you are here" indicator via the dot on the line.
  return (
    <svg
      width="20"
      height="24"
      viewBox="0 0 20 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <line x1="10" y1="1" x2="10" y2="23" stroke="var(--accent)" strokeWidth="2" />
      <line x1="2" y1="6" x2="18" y2="6" stroke="var(--accent)" strokeWidth="2" />
      <path d="M2 6 Q10 12 2 19" stroke="var(--sidebar-ink)" strokeWidth="1.25" fill="none" opacity="0.6" />
      <path d="M18 6 Q10 12 18 19" stroke="var(--sidebar-ink)" strokeWidth="1.25" fill="none" opacity="0.6" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <PoleMark />
        <div>
          <div className="text-[13px] font-semibold tracking-wide text-[var(--sidebar-ink-active)]">
            LineWorks
          </div>
          <div className="text-[11px] text-[var(--sidebar-ink)]">Asset Management</div>
        </div>
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
