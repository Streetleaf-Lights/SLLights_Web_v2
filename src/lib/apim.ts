// Azure API Management (APIM) client
//
// This is a thin fetch wrapper for calling the internal Azure APIM gateway.
// Customers are wired to the real /getCustomers endpoint — getCustomers()
// fetches the full list, getCustomer(id) uses the ?customerId= filter to
// fetch just one record. Projects are wired to the real /getProjects
// endpoint via getProjectsForCustomer(customerId). Pole vitals (lights
// working / faults) come from /getPoleVitals via getPoleVitalsForCustomer.
// Poles are wired to the real /getPoles endpoint via getPoles(filters) /
// getPole(poleId), supporting optional poleId/projectId/customerId filters.
// Users are wired to the real /getUsers endpoint via getUsers().
//
// Configure via environment variables (see .env.local.example):
//   NEXT_PUBLIC_APIM_BASE_URL   defaults to https://lights-v2-apim.azure-api.net
//   APIM_SUBSCRIPTION_KEY       Ocp-Apim-Subscription-Key (server-side only)
//   APIM_CACHE_SECONDS          how long responses are cached before Next.js
//                               revalidates in the background (default 30)

import type {
  Customer,
  CustomerPoleVitals,
  CustomerProjectRef,
  PeriodType,
  Pole,
  PoleSummary,
  PoleVitalsByPeriod,
  Project,
  User,
} from "./types";
import { time } from "./timing";

const APIM_BASE_URL =
  process.env.NEXT_PUBLIC_APIM_BASE_URL || "https://lights-v2-apim.azure-api.net";
const APIM_SUBSCRIPTION_KEY = process.env.APIM_SUBSCRIPTION_KEY ?? "";

// The observed 500ms–1900ms swing on /customers is the live network round
// trip to Azure APIM itself (Next.js's own overhead is ~2ms per its request
// log) — most likely backend cold starts or gateway load, not something we
// can fix from this codebase. What we CAN do is stop paying that variable
// cost on every single request: cache each response for this many seconds,
// with Next.js quietly revalidating in the background after it expires.
// Trade-off: a customer record change can take up to this long to show up.
const APIM_CACHE_SECONDS = Number(process.env.APIM_CACHE_SECONDS ?? 30);

export class ApimError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApimError";
  }
}

/**
 * Generic authenticated fetch against the APIM gateway.
 *
 * `tags` lets a caller mark this fetch for on-demand invalidation via
 * Next.js's revalidateTag — used by getUsers() so /api/inviteuser can force
 * the next getUsers() call to hit APIM fresh, rather than the person having
 * to wait out the full APIM_CACHE_SECONDS window after inviting someone.
 *
 * `noStore` skips Next.js's Data Cache entirely — for responses known to
 * exceed its 2MB per-entry limit (e.g. the ~14k-pole /getPoles response),
 * where the framework would otherwise log a "Failed to set fetch cache"
 * warning on every single request while gaining no caching benefit anyway.
 */
export async function apimFetch<T>(
  path: string,
  options?: { tags?: string[]; noStore?: boolean },
): Promise<T> {
  if (!APIM_BASE_URL) {
    throw new ApimError(
      "NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.",
    );
  }

  return time(`apimFetch ${path}`, async () => {
    const res = await fetch(`${APIM_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
      },
      ...(options?.noStore
        ? { cache: "no-store" as const }
        : { next: { revalidate: APIM_CACHE_SECONDS, tags: options?.tags } }),
    });

    if (!res.ok) {
      throw new ApimError(`APIM request failed: ${path}`, res.status);
    }

    return res.json() as Promise<T>;
  });
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

/** Shape returned by GET /getCustomers before we normalize it. */
export interface RawCustomer {
  id: string;
  name: string;
  /** JSON-stringified string[], e.g. "[]" or '["Bayou District Rebuild"]' */
  projectNames: string;
  /** JSON-stringified string[], parallel to projectNames */
  projectIds: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  createdAt: string;
}

/** projectNames/projectIds arrive as JSON-stringified arrays; parse defensively. */
export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function normalizeCustomer(raw: RawCustomer): Customer {
  const names = parseJsonStringArray(raw.projectNames);
  const ids = parseJsonStringArray(raw.projectIds);
  const projects: CustomerProjectRef[] = names.map((name, i) => ({
    id: ids[i] ?? `${raw.id}-project-${i}`,
    name,
  }));

  return {
    id: raw.id,
    name: raw.name,
    projects,
    address: raw.address,
    city: raw.city,
    state: raw.state,
    zip: raw.zip,
    phone: raw.phone,
    createdAt: raw.createdAt,
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const raw = await apimFetch<RawCustomer[]>("/getCustomers");
  return raw.map(normalizeCustomer);
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  return time(`getCustomer(${id})`, async () => {
    // /getCustomers accepts a customerId filter and returns just that record
    // as a single object (confirmed — not wrapped in an array), so we no
    // longer need to fetch and scan the full list for a lookup.
    const raw = await apimFetch<RawCustomer | null>(
      `/getCustomers?customerId=${encodeURIComponent(id)}`,
    );
    return raw ? normalizeCustomer(raw) : undefined;
  });
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/** Shape returned by GET /getProjects?customerId=... before we normalize it. */
export interface RawProject {
  id: string;
  name: string;
  /** JSON-stringified string[] */
  poleNumbers: string;
  /** JSON-stringified string[], parallel to poleNumbers */
  poleIds: string;
  customerId: string;
  polesUnderContract: number;
  effectiveDate: string;
  /** JSON-stringified string[] */
  installDates: string;
  createdAt: string;
}

export function normalizeProject(raw: RawProject): Project {
  return {
    id: raw.id,
    name: raw.name,
    customerId: raw.customerId,
    poleNumbers: parseJsonStringArray(raw.poleNumbers),
    poleIds: parseJsonStringArray(raw.poleIds),
    polesUnderContract: raw.polesUnderContract,
    effectiveDate: raw.effectiveDate,
    installDates: parseJsonStringArray(raw.installDates),
    createdAt: raw.createdAt,
  };
}

export async function getProjectsForCustomer(customerId: string): Promise<Project[]> {
  const raw = await apimFetch<RawProject[]>(
    `/getProjects?customerId=${encodeURIComponent(customerId)}`,
  );
  return raw.map(normalizeProject);
}

// ---------------------------------------------------------------------------
// Pole vitals (lights working / faults, per customer + per project)
// ---------------------------------------------------------------------------

export async function getPoleVitalsForCustomer(
  customerId: string,
): Promise<CustomerPoleVitals | undefined> {
  const raw = await apimFetch<CustomerPoleVitals | null>(
    `/getPoleVitals?customerId=${encodeURIComponent(customerId)}`,
  );
  return raw ?? undefined;
}

// ---------------------------------------------------------------------------
// Poles
// ---------------------------------------------------------------------------

export interface PoleFilters {
  poleId?: string;
  projectId?: string;
  customerId?: string;
}

function buildPoleQuery(filters?: PoleFilters & { summary?: boolean }): string {
  const params = new URLSearchParams();
  if (filters?.poleId) params.set("poleId", filters.poleId);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.customerId) params.set("customerId", filters.customerId);
  if (filters?.summary) params.set("summary", "true");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * GET /getPoles?summary=true, optionally filtered by projectId and/or
 * customerId. Summary mode lifts the 1000-row cap the plain endpoint
 * applies — needed since the whole system has ~14k poles — in exchange for
 * a lighter per-pole payload (no lastUpdate or battery voltages).
 *
 * Sorted here by poleNumber (numeric-aware, so "PAS-4938" precedes
 * "PAS-10000" rather than following it lexicographically) since the
 * backend's own ordering isn't reliably poleNumber order.
 *
 * Uses noStore: the unfiltered response is ~9MB — comfortably over Next's
 * 2MB Data Cache limit — so caching it would fail on every request anyway
 * (logged as a "Failed to set fetch cache" warning), with zero benefit.
 */
export async function getPoles(filters?: PoleFilters): Promise<PoleSummary[]> {
  const raw = await apimFetch<PoleSummary[]>(
    `/getPoles${buildPoleQuery({ ...filters, summary: true })}`,
    { noStore: true },
  );
  return raw
    .slice()
    .sort((a, b) => a.poleNumber.localeCompare(b.poleNumber, undefined, { numeric: true }));
}

/**
 * Full single-pole record (not summary-limited — filtering to one poleId
 * never approaches the row cap, so this returns every field).
 */
export async function getPole(poleId: string): Promise<Pole | undefined> {
  const raw = await apimFetch<Pole[]>(`/getPoles${buildPoleQuery({ poleId })}`);
  return raw[0];
}

/**
 * GET /getPoleVitalsByPeriod?poleId=&periodType=&limit= — powers the pole
 * detail page's vitals-over-time chart. Bypasses apimFetch (like the
 * mutating endpoints) because its generic, body-discarding ApimError would
 * swallow the specific messages this endpoint returns — e.g.
 * "periodType must be one of: Hour, Day" or "pole not found" — which the
 * chart surfaces directly rather than a generic failure. Still a read, so
 * (unlike the mutating endpoints) it keeps the usual revalidate caching.
 */
export async function getPoleVitalsByPeriod({
  poleId,
  periodType,
  limit,
}: {
  poleId: string;
  periodType: PeriodType;
  limit: number;
}): Promise<PoleVitalsByPeriod> {
  if (!APIM_BASE_URL) {
    throw new ApimError("NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.");
  }

  const query = new URLSearchParams({ poleId, periodType, limit: String(limit) });
  const res = await fetch(`${APIM_BASE_URL}/getPoleVitalsByPeriod?${query}`, {
    headers: { "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY },
    next: { revalidate: APIM_CACHE_SECONDS },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body.error === "string" ? body.error : "Failed to load pole vitals.";
    throw new ApimError(message, res.status);
  }

  return body as PoleVitalsByPeriod;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * GET /getUsers — returns User[] directly matching our shape, no parsing
 * needed. Tagged "users" so /api/inviteuser can force-refresh this list
 * immediately after a successful invite (see revalidateTag call there).
 */
export async function getUsers(): Promise<User[]> {
  return apimFetch<User[]>("/getUsers", { tags: ["users"] });
}

/**
 * name, email, and role are always sent; customerId is only included when
 * the invite is for a Customer Admin — Streetleaf Admin invites have no
 * associated customer, matching the sample request/response pair this was
 * wired against (no customerId key at all for a Streetleaf Admin invite,
 * rather than customerId: null).
 */
export interface InviteUserInput {
  name: string;
  email: string;
  role: string;
  customerId?: string;
}

export interface InviteUserResult {
  userId: string;
  email: string;
  emailSent: boolean;
}

/**
 * Like signIn below, this bypasses apimFetch: it's a mutating call (so no
 * caching/revalidation) and we want the real error message from a non-ok
 * response rather than apimFetch's generic, body-discarding ApimError.
 *
 * Unlike the read endpoints, /inviteUser requires the signed-in user's own
 * JWT (from /signIn) as a Bearer token, on top of the subscription key —
 * it 400s with "missing or malformed Authorization header" without it.
 * That token lives in the httpOnly session cookie set by /api/signin, so
 * the route handler reads it and passes it through here.
 */
export async function inviteUser(
  input: InviteUserInput,
  token: string,
): Promise<InviteUserResult> {
  if (!APIM_BASE_URL) {
    throw new ApimError("NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.");
  }

  const body: Record<string, string> = {
    name: input.name,
    email: input.email,
    role: input.role,
  };
  if (input.customerId) {
    body.customerId = input.customerId;
  }

  const res = await fetch(`${APIM_BASE_URL}/inviteUser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const responseBody = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      responseBody && typeof responseBody.error === "string"
        ? responseBody.error
        : "Invite failed.";
    throw new ApimError(message, res.status);
  }

  return responseBody as InviteUserResult;
}

/**
 * POST /resendInvite — re-sends the invitation email to a user who's still
 * in "Pending" status (accepted an invite that hasn't been completed via
 * registration yet). Doesn't change any user data itself, so unlike
 * inviteUser/deleteUser there's no "users" cache tag to invalidate after
 * this succeeds.
 */
export async function resendInvite(userId: string, token: string): Promise<void> {
  if (!APIM_BASE_URL) {
    throw new ApimError("NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.");
  }

  const res = await fetch(`${APIM_BASE_URL}/resendInvite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body && typeof body.error === "string" ? body.error : "Resend invite failed.";
    throw new ApimError(message, res.status);
  }
}

/**
 * POST /deleteUser?userId=... — userId goes in the query string, not the
 * body (unlike inviteUser). Like inviteUser, requires the caller's own JWT
 * as a Bearer token on top of the subscription key, and bypasses apimFetch
 * since this is a mutating call needing the real error message from a
 * non-ok response.
 */
export async function deleteUser(userId: string, token: string): Promise<void> {
  if (!APIM_BASE_URL) {
    throw new ApimError("NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.");
  }

  const res = await fetch(`${APIM_BASE_URL}/deleteUser?userId=${encodeURIComponent(userId)}`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body && typeof body.error === "string" ? body.error : "Delete failed.";
    throw new ApimError(message, res.status);
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  customerId: string | null;
}

export interface SignInResult {
  token: string;
  user: AuthUser;
}

/**
 * POST /signIn. Deliberately doesn't go through apimFetch: that helper (a)
 * caches/revalidates via `next: { revalidate }`, which is wrong for a
 * mutating auth call, and (b) discards the response body on a non-ok
 * status, which is exactly where the useful `{ error: "invalid email or
 * password" }` message lives. On failure this throws an ApimError carrying
 * that message so the sign-in form can show it verbatim instead of a
 * generic failure.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (!APIM_BASE_URL) {
    throw new ApimError("NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.");
  }

  const res = await fetch(`${APIM_BASE_URL}/signIn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body && typeof body.error === "string" ? body.error : "Sign in failed.";
    throw new ApimError(message, res.status);
  }

  return body as SignInResult;
}

/**
 * POST /registerUser — completes an invite by setting a password. The
 * request carries the invite token from the emailed link plus the chosen
 * password; no Authorization header is needed since the invite token IS
 * the credential here (there's no signed-in user yet). The response
 * mirrors signIn's shape ({ token, user }) since a successful registration
 * also immediately establishes a session.
 */
export async function registerUser(inviteToken: string, password: string): Promise<SignInResult> {
  if (!APIM_BASE_URL) {
    throw new ApimError("NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.");
  }

  const res = await fetch(`${APIM_BASE_URL}/registerUser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
    },
    body: JSON.stringify({ token: inviteToken, password }),
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body.error === "string" ? body.error : "Registration failed.";
    throw new ApimError(message, res.status);
  }

  return body as SignInResult;
}

/**
 * POST /signOut. Only needs the caller's own JWT as a Bearer token — no
 * request body. Like signIn/inviteUser, bypasses apimFetch since this is a
 * mutating call and we want the real error message from a non-ok response.
 */
export async function signOut(token: string): Promise<void> {
  if (!APIM_BASE_URL) {
    throw new ApimError("NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.");
  }

  const res = await fetch(`${APIM_BASE_URL}/signOut`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body && typeof body.error === "string" ? body.error : "Sign out failed.";
    throw new ApimError(message, res.status);
  }
}

export interface ForgotPasswordResult {
  message: string;
}

/**
 * POST /forgotPassword. Deliberately returns the same generic message
 * ("If that email exists, a reset link has been sent.") whether or not
 * the email actually matches an account — that's a security property, not
 * a bug, so we don't try to surface anything more specific from it. No
 * Authorization header needed; there's no signed-in user at this point.
 */
export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  if (!APIM_BASE_URL) {
    throw new ApimError("NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.");
  }

  const res = await fetch(`${APIM_BASE_URL}/forgotPassword`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
    },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body.error === "string" ? body.error : "Something went wrong. Please try again.";
    throw new ApimError(message, res.status);
  }

  return body as ForgotPasswordResult;
}

export interface ResetPasswordResult {
  success: boolean;
}

/**
 * POST /resetPassword — completes the flow started by forgotPassword. The
 * reset token comes from the emailed link (a different token than an
 * invite token, but the same shape: it's the credential here, so no
 * Authorization header is needed).
 */
export async function resetPassword(
  resetToken: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  if (!APIM_BASE_URL) {
    throw new ApimError("NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.");
  }

  const res = await fetch(`${APIM_BASE_URL}/resetPassword`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
    },
    body: JSON.stringify({ token: resetToken, newPassword }),
    cache: "no-store",
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body && typeof body.error === "string" ? body.error : "Reset failed.";
    throw new ApimError(message, res.status);
  }

  return body as ResetPasswordResult;
}

