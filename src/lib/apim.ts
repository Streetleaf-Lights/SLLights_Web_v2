// Azure API Management (APIM) client
//
// This is a thin fetch wrapper for calling the internal Azure APIM gateway.
// Customers are wired to the real /getCustomers endpoint — getCustomers()
// fetches the full list, getCustomer(id) uses the ?customerId= filter to
// fetch just one record. Poles and Users are still STUBBED with in-memory
// mock data until their endpoints exist — swap the mock return for the
// `apimFetch<T>(...)` call (see the TODOs below) once they're live.
//
// Configure via environment variables (see .env.local.example):
//   NEXT_PUBLIC_APIM_BASE_URL   defaults to https://lights-v2-apim.azure-api.net
//   APIM_SUBSCRIPTION_KEY       Ocp-Apim-Subscription-Key (server-side only)

import type { Customer, CustomerProjectRef, Pole, User } from "./types";
import { mockPoles, mockUsers } from "./mock-data";
import { time } from "./timing";

const APIM_BASE_URL =
  process.env.NEXT_PUBLIC_APIM_BASE_URL || "https://lights-v2-apim.azure-api.net";
const APIM_SUBSCRIPTION_KEY = process.env.APIM_SUBSCRIPTION_KEY ?? "";

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
 */
export async function apimFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!APIM_BASE_URL) {
    throw new ApimError(
      "NEXT_PUBLIC_APIM_BASE_URL is not configured. Set it in .env.local.",
    );
  }

  return time(`apimFetch ${path}`, async () => {
    const res = await fetch(`${APIM_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY,
        ...init?.headers,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new ApimError(`APIM request failed: ${path}`, res.status);
    }

    return res.json() as Promise<T>;
  });
}

/** Small helper to simulate network latency for stubbed data during development. */
function stubDelay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
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
// Poles
// ---------------------------------------------------------------------------

export async function getPoles(): Promise<Pole[]> {
  // TODO: replace with apimFetch<Pole[]>("/poles")
  return stubDelay(mockPoles);
}

export async function getPole(id: string): Promise<Pole | undefined> {
  // TODO: replace with apimFetch<Pole>(`/poles/${id}`)
  return stubDelay(mockPoles.find((p) => p.id === id));
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<User[]> {
  // TODO: replace with apimFetch<User[]>("/users")
  return stubDelay(mockUsers);
}

