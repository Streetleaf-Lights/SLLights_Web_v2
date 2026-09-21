"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteUserModal({
  customers,
  lockedCustomer,
  canInviteOwner = false,
}: {
  customers: Customer[];
  /**
   * When set, this invite is scoped to a single customer that can't be
   * changed (a Customer Admin or Customer Owner inviting into their own
   * customer) — the Customer Search UI is hidden entirely in favor of a
   * plain read-only label, and selectedCustomer/role start (and reset
   * back to) this customer / "Customer Admin" instead of the Streetleaf
   * Admin default.
   */
  lockedCustomer?: Customer;
  /**
   * Whether "Customer Owner" is offered as a role choice at all — true
   * for a Streetleaf Admin (any customer) or the customer's own current
   * Customer Owner (transferring their own ownership). A plain Customer
   * Admin never gets this option, even though they can otherwise invite
   * same as an Owner. Only matters once a customer context exists
   * (locked, or picked via Customer Search) — "Customer Owner" has no
   * meaning without one.
   */
  canInviteOwner?: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    lockedCustomer ?? null,
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [role, setRole] = useState(lockedCustomer ? "Customer Admin" : "Streetleaf Admin");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      emailRef.current?.focus();
    }
  }, [isOpen]);

  // A customer literally named "Streetleaf" (as opposed to no customer
  // being selected at all, which is the more common way to get a
  // Streetleaf Admin invite) is treated the same as the internal/
  // top-level case, not as a real customer — Customer Search still shows
  // it as a normal, selectable option, but picking it defaults the role
  // to Streetleaf Admin (not Customer Admin) and omits customerId on
  // submit (not that customer's own id), exactly as if nothing had been
  // selected. This only applies to a customer chosen via Customer Search
  // — not lockedCustomer, since that's always a genuine Customer Admin's
  // own customer, and letting them grant Streetleaf Admin just because
  // their own customer happens to be named that would be a real
  // privilege-escalation risk. Trimmed before comparing — the real
  // customer record has a trailing space ("Streetleaf "), which a bare
  // === would silently never match.
  const treatsAsNoCustomer = !lockedCustomer && selectedCustomer?.name.trim() === "Streetleaf";

  // A Streetleaf Admin doesn't belong to any customer — that's the default
  // when no customer is picked (or the picked one is treated the same
  // way, see treatsAsNoCustomer above). Selecting an actual customer
  // means this invite is for someone at that customer, i.e. a Customer
  // Admin by default. Either way, "User" is always offered as the other
  // option. Whenever the customer context changes (see the handlers
  // below), role is reset back to that context's own default, rather
  // than silently keeping a choice (e.g. "User", or the other context's
  // admin role) made under the previous context.
  const defaultRole = selectedCustomer && !treatsAsNoCustomer ? "Customer Admin" : "Streetleaf Admin";

  // "Customer Owner" only makes sense once there's an actual customer to
  // own — locked to one (a Customer Admin/Owner inviting into their own),
  // or picked via Customer Search and not the Streetleaf special case.
  const hasCustomerContext = Boolean(lockedCustomer) || (selectedCustomer != null && !treatsAsNoCustomer);
  const canOfferOwner = canInviteOwner && hasCustomerContext;

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, customerQuery]);

  const trimmedEmail = email.trim();
  const emailError = !(attempted || emailTouched)
    ? null
    : !trimmedEmail
      ? "Email is required."
      : !EMAIL_PATTERN.test(trimmedEmail)
        ? "Enter a valid email address."
        : null;
  const nameError = (attempted || nameTouched) && !name.trim() ? "Name is required." : null;

  function reset() {
    setCustomerQuery("");
    setSelectedCustomer(lockedCustomer ?? null);
    setEmail("");
    setName("");
    setRole(lockedCustomer ? "Customer Admin" : "Streetleaf Admin");
    setAttempted(false);
    setEmailTouched(false);
    setNameTouched(false);
    setSearchFocused(false);
    setSubmitting(false);
    setFormError(null);
  }

  function close() {
    setIsOpen(false);
    reset();
  }

  async function handleSubmit() {
    setAttempted(true);
    setFormError(null);
    const valid = trimmedEmail && EMAIL_PATTERN.test(trimmedEmail) && name.trim();
    if (!valid) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/inviteuser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: trimmedEmail,
          role,
          customerId: treatsAsNoCustomer ? undefined : selectedCustomer?.id,
        }),
      });
      const body = await res.json().catch(() => null);

      if (res.status === 401) {
        // The session actually expired server-side — an inline error here
        // would be a dead end, since retrying would just fail the same
        // way. Send them to sign back in instead.
        setIsOpen(false);
        router.push("/signin");
        router.refresh();
        return;
      }

      if (!res.ok) {
        setFormError(body?.error ?? "Invite failed. Please try again.");
        setSubmitting(false);
        return;
      }

      close();
      // Users page is server-rendered (force-dynamic) — refresh re-fetches
      // getUsers()/getCustomers() so the newly invited user shows up right
      // away instead of waiting for the next natural navigation/revalidate.
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function handleChangeCustomer() {
    setSelectedCustomer(null);
    setRole("Streetleaf Admin");
    customerSearchRef.current?.focus();
  }

  function handleSelectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setRole(customer.name.trim() === "Streetleaf" ? "Streetleaf Admin" : "Customer Admin");
    setSearchFocused(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-[var(--accent)] px-3.5 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-[var(--accent-strong)]"
      >
        Invite user
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-user-title"
            className="w-full max-w-[420px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="invite-user-title" className="text-[16px] font-semibold text-[var(--ink)]">
              Invite user
            </h2>

            {lockedCustomer ? (
              <div className="mt-4">
                <span className="text-[12px] font-medium text-[var(--ink-muted)]">Customer</span>
                <p className="mt-1.5 text-[13px] text-[var(--ink)]">{lockedCustomer.name}</p>
              </div>
            ) : (
              <div className="mt-4">
                <label
                  htmlFor="invite-customer-search"
                  className="text-[12px] font-medium text-[var(--ink-muted)]"
                >
                  Customer Search
                </label>
                <input
                  id="invite-customer-search"
                  ref={customerSearchRef}
                  type="text"
                  value={customerQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomerQuery(value);
                    // Clearing the box back to empty while a customer is
                    // selected is treated the same as clicking "Change" —
                    // it un-picks the customer, so the role reverts to
                    // Streetleaf Admin rather than silently staying on
                    // Customer Admin (or a "User" choice made under that
                    // context) for a customer no longer visible/typed.
                    if (value === "" && selectedCustomer) {
                      setSelectedCustomer(null);
                      setRole("Streetleaf Admin");
                    }
                  }}
                  onFocus={(e) => {
                    e.target.select();
                    setSearchFocused(true);
                  }}
                  placeholder="Search customers…"
                  className="mt-1.5 w-full rounded-md border border-[var(--border)] px-3 py-2 text-[13px] text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
                {searchFocused && (
                  <div className="mt-1.5 max-h-32 overflow-y-auto rounded-md border border-[var(--border)]">
                    {filteredCustomers.length === 0 ? (
                      <p className="px-3 py-2 text-[12.5px] text-[var(--ink-faint)]">
                        No matching customers.
                      </p>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="block w-full border-b border-[var(--border)] px-3 py-2 text-left text-[13px] text-[var(--ink)] last:border-b-0 hover:bg-[var(--surface-sunken)]"
                        >
                          {c.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedCustomer && (
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[13px] text-[var(--ink-muted)]">
                      Selected:{" "}
                      <span className="font-medium text-[var(--accent)]">
                        {selectedCustomer.name}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleChangeCustomer}
                      className="text-[12px] font-medium text-[var(--accent-ink)] hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="invite-email"
                className="text-[12px] font-medium text-[var(--ink-muted)]"
              >
                Email
              </label>
              <input
                id="invite-email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailTouched(true);
                }}
                className={`mt-1.5 w-full rounded-md border px-3 py-2 text-[13px] text-[var(--ink)] focus:outline-none focus:ring-2 ${
                  emailError
                    ? "border-[var(--status-flagged)] focus:ring-[var(--status-flagged-bg)]"
                    : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent-soft)]"
                }`}
              />
              {emailError && (
                <p className="mt-1 text-[12px] text-[var(--status-flagged)]">{emailError}</p>
              )}
            </div>

            <div className="mt-4">
              <label
                htmlFor="invite-name"
                className="text-[12px] font-medium text-[var(--ink-muted)]"
              >
                Name
              </label>
              <input
                id="invite-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameTouched(true);
                }}
                className={`mt-1.5 w-full rounded-md border px-3 py-2 text-[13px] text-[var(--ink)] focus:outline-none focus:ring-2 ${
                  nameError
                    ? "border-[var(--status-flagged)] focus:ring-[var(--status-flagged-bg)]"
                    : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent-soft)]"
                }`}
              />
              {nameError && <p className="mt-1 text-[12px] text-[var(--status-flagged)]">{nameError}</p>}
            </div>

            <div className="mt-4">
              <label
                htmlFor="invite-role"
                className="text-[12px] font-medium text-[var(--ink-muted)]"
              >
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              >
                <option value={defaultRole}>{defaultRole}</option>
                {canOfferOwner && <option value="Customer Owner">Customer Owner</option>}
                <option value="User">User</option>
              </select>
              {role === "Customer Owner" && (
                <p className="mt-1.5 text-[12px] text-[var(--status-flagged)]">
                  This transfers ownership — once accepted, the current Customer Owner is
                  removed.
                </p>
              )}
            </div>

            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-[var(--status-flagged)] bg-[var(--status-flagged-bg)] px-3 py-2 text-[12.5px] text-[var(--status-flagged)]"
              >
                {formError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-[var(--border)] px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-sunken)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-md bg-[var(--accent)] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Sending…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
