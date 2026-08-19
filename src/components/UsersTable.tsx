"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { initials } from "@/lib/text";

const PAGE_SIZE = 10;

function statusBadgeKind(status: string | null | undefined): "active" | "pending" | "inactive" {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "pending") return "pending";
  return "inactive";
}

export function UsersTable({
  users,
  canManageUsers = true,
  currentUserId,
}: {
  users: User[];
  canManageUsers?: boolean;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reinvitingUserId, setReinvitingUserId] = useState<string | null>(null);
  const [reinviteResult, setReinviteResult] = useState<{
    userId: string;
    text: string;
    isError: boolean;
  } | null>(null);

  function closeConfirm() {
    setPendingDelete(null);
    setDeleting(false);
    setDeleteError(null);
  }

  async function handleReinvite(user: User) {
    setReinvitingUserId(user.id);
    setReinviteResult(null);
    try {
      const res = await fetch("/api/resendinvite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const body = await res.json().catch(() => null);

      if (res.status === 401) {
        // Same reasoning as handleConfirmDelete — an inline error here
        // would be a dead end, since retrying would just fail the same way.
        router.push("/signin");
        router.refresh();
        return;
      }

      if (!res.ok) {
        setReinviteResult({
          userId: user.id,
          text: body?.error ?? "Resend failed. Please try again.",
          isError: true,
        });
        return;
      }

      setReinviteResult({ userId: user.id, text: "Invite sent.", isError: false });
    } catch {
      setReinviteResult({
        userId: user.id,
        text: "Something went wrong. Please try again.",
        isError: true,
      });
    } finally {
      setReinvitingUserId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/deleteuser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingDelete.id }),
      });
      const body = await res.json().catch(() => null);

      if (res.status === 401) {
        // The session actually expired server-side (see the cookie-maxAge
        // fix in /api/signin) — an inline error here would be a dead end,
        // since retrying would just fail the same way. Send them to sign
        // back in instead.
        router.push("/signin");
        router.refresh();
        return;
      }

      if (!res.ok) {
        setDeleteError(body?.error ?? "Delete failed. Please try again.");
        setDeleting(false);
        return;
      }

      closeConfirm();
      // Users page is server-rendered (force-dynamic) — refresh re-fetches
      // getUsers() so the deleted user disappears right away, same as
      // InviteUserModal does after a successful invite.
      router.refresh();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="mx-8 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-sunken)] text-[11.5px] uppercase tracking-wide text-[var(--ink-muted)]">
              <th className="py-2.5 pl-4 pr-4 font-medium">Name</th>
              <th className="py-2.5 pr-4 font-medium">Email</th>
              <th className="py-2.5 pr-4 font-medium">Role</th>
              <th className="py-2.5 pr-4 font-medium">Status</th>
              <th className="py-2.5 pr-4 font-medium">Customer</th>
              {canManageUsers && <th className="py-2.5 pr-8 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageUsers.map((user) => (
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
                <td className="py-3 pr-4 text-[var(--ink)]">{user.role}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={statusBadgeKind(user.status)} />
                </td>
                <td className="py-3 pr-4 text-[var(--ink)]">
                  {user.customerId === null ? "Streetleaf" : user.customerName}
                </td>
                {canManageUsers && (
                  <td className="py-3 pr-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {statusBadgeKind(user.status) === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleReinvite(user)}
                          disabled={reinvitingUserId === user.id}
                          className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[12px] font-medium text-[var(--accent-ink)] hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reinvitingUserId === user.id ? "Sending…" : "Re-invite"}
                        </button>
                      )}
                      {user.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(user)}
                          className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[12px] font-medium text-[var(--status-flagged)] hover:bg-[var(--status-flagged-bg)]"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {reinviteResult?.userId === user.id && (
                      <p
                        role={reinviteResult.isError ? "alert" : "status"}
                        className={`mt-1 text-[11px] ${
                          reinviteResult.isError
                            ? "text-[var(--status-flagged)]"
                            : "text-[var(--status-active)]"
                        }`}
                      >
                        {reinviteResult.text}
                      </p>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeConfirm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-[420px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-user-title" className="text-[16px] font-semibold text-[var(--ink)]">
              Delete user
            </h2>
            <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
              Are you sure you want to delete{" "}
              <span className="font-medium text-[var(--ink)]">{pendingDelete.name}</span>? This
              can&rsquo;t be undone.
            </p>

            {deleteError && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-[var(--status-flagged)] bg-[var(--status-flagged-bg)] px-3 py-2 text-[12.5px] text-[var(--status-flagged)]"
              >
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-md border border-[var(--border)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-sunken)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-md bg-[var(--status-flagged)] px-3.5 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
