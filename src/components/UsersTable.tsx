import type { User } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UsersTable({ users }: { users: User[] }) {
  return (
    <div className="mx-8 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken)] text-[11.5px] uppercase tracking-wide text-[var(--ink-muted)]">
            <th className="py-2.5 pl-4 pr-4 font-medium">Name</th>
            <th className="py-2.5 pr-4 font-medium">Email</th>
            <th className="py-2.5 pr-4 font-medium">Role</th>
            <th className="py-2.5 pr-4 font-medium">Status</th>
            <th className="py-2.5 pr-8 text-right font-medium">Last active</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-sunken)]"
            >
              <td className="py-3 pl-4 pr-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--accent-ink)]">
                    {initials(user.name)}
                  </span>
                  <span className="font-medium text-[var(--ink)]">{user.name}</span>
                </div>
              </td>
              <td className="py-3 pr-4 font-mono-data text-[12px] text-[var(--ink-muted)]">
                {user.email}
              </td>
              <td className="py-3 pr-4">
                <StatusBadge status={user.role} />
              </td>
              <td className="py-3 pr-4">
                <StatusBadge status={user.active ? "active" : "inactive"} />
              </td>
              <td className="py-3 pr-8 text-right font-mono-data text-[12px] text-[var(--ink-faint)]">
                {user.lastActive}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
