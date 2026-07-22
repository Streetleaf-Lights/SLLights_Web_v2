// Azure API Management (APIM) client
//
// This is a thin fetch wrapper for calling the internal Azure APIM gateway.
// Every resource function below (getCustomers, getPoles, getUsers, ...) is
// currently STUBBED with in-memory mock data so the pages can be built and
// reviewed before the APIM routes exist. Swap the mock return for the
// `apimFetch<T>(...)` call once the corresponding endpoint is live.
//
// Configure via environment variables (see .env.local.example):
//   NEXT_PUBLIC_APIM_BASE_URL   e.g. https://my-org.azure-api.net/internal
//   APIM_SUBSCRIPTION_KEY       Ocp-Apim-Subscription-Key (server-side only)

import type { Customer, Pole, Project, User } from "./types";
import { mockCustomers, mockPoles, mockProjects, mockUsers } from "./mock-data";

const APIM_BASE_URL = process.env.NEXT_PUBLIC_APIM_BASE_URL ?? "";
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
 * Not yet wired into any page — used once real endpoints are available.
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
}

/** Small helper to simulate network latency for stubbed data during development. */
function stubDelay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function getCustomers(): Promise<Customer[]> {
  // TODO: replace with apimFetch<Customer[]>("/customers")
  return stubDelay(mockCustomers);
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  // TODO: replace with apimFetch<Customer>(`/customers/${id}`)
  return stubDelay(mockCustomers.find((c) => c.id === id));
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function getProjectsForCustomer(
  customerId: string,
): Promise<Project[]> {
  // TODO: replace with apimFetch<Project[]>(`/customers/${customerId}/projects`)
  return stubDelay(mockProjects.filter((p) => p.customerId === customerId));
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
