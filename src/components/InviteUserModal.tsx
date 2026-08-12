"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteUserModal({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      emailRef.current?.focus();
    }
  }, [isOpen]);

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

  // A Streetleaf Admin doesn't belong to any customer — that's the default,
  // blank-search state. Selecting an actual customer means this invite is
  // for someone at that customer, i.e. a Customer Admin.
  const role = selectedCustomer ? "Customer Admin" : "Streetleaf Admin";

  function reset() {
    setCustomerQuery("");
    setSelectedCustomer(null);
    setEmail("");
    setName("");
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
          customerId: selectedCustomer?.id,
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
    customerSearchRef.current?.focus();
  }

  function handleSelectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
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

            <div className="mt-4">
              {selectedCustomer && (
                <div className="mb-1.5 flex items-center justify-between">
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
                  // Customer Admin for a customer no longer visible/typed.
                  if (value === "" && selectedCustomer) {
                    setSelectedCustomer(null);
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
            </div>

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
              <input
                id="invite-role"
                type="text"
                value={role}
                disabled
                className="mt-1.5 w-full cursor-not-allowed rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-[13px] text-[var(--ink-muted)]"
              />
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
