import { describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

import { decodeSessionToken, getSessionUser, homeRouteForRole } from "@/lib/session";
import { getSecondsUntilExpiry } from "@/lib/auth-role";

function encodePayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `header.${encodePayload(payload)}.signature`;
}

function mockCookieValue(value: string | undefined) {
  cookiesMock.mockResolvedValue({
    get: (name: string) => (name === "session" && value !== undefined ? { value } : undefined),
  });
}

describe("getSessionUser", () => {
  it("returns null when there is no session cookie", async () => {
    mockCookieValue(undefined);

    expect(await getSessionUser()).toBeNull();
  });

  it("decodes id, role, and customerId from a valid Customer Admin token", async () => {
    mockCookieValue(
      fakeJwt({
        sub: "1445C5D1-37C2-43CF-9F82-6223F425B265",
        role: "Customer Admin",
        customerId: "rec5uaHZMOGZGyVcY",
      }),
    );

    expect(await getSessionUser()).toEqual({
      id: "1445C5D1-37C2-43CF-9F82-6223F425B265",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
  });

  it("decodes customerId as null for a Streetleaf Admin token", async () => {
    mockCookieValue(
      fakeJwt({
        sub: "6496D8A1-7A59-4673-9C29-BB522B94CD28",
        role: "Streetleaf Admin",
        customerId: null,
      }),
    );

    expect(await getSessionUser()).toEqual({
      id: "6496D8A1-7A59-4673-9C29-BB522B94CD28",
      role: "Streetleaf Admin",
      customerId: null,
    });
  });

  it("returns null for a malformed token (wrong number of segments)", async () => {
    mockCookieValue("not-a-real-jwt");

    expect(await getSessionUser()).toBeNull();
  });

  it("returns null when the payload isn't valid JSON", async () => {
    mockCookieValue("header.not-valid-base64-json.signature");

    expect(await getSessionUser()).toBeNull();
  });

  it("returns null when the payload is missing sub or role", async () => {
    mockCookieValue(fakeJwt({ role: "Customer Admin" }));

    expect(await getSessionUser()).toBeNull();
  });
});

describe("decodeSessionToken", () => {
  it("decodes a valid token without needing next/headers", () => {
    const token = fakeJwt({
      sub: "1445C5D1-37C2-43CF-9F82-6223F425B265",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });

    expect(decodeSessionToken(token)).toEqual({
      id: "1445C5D1-37C2-43CF-9F82-6223F425B265",
      role: "Customer Admin",
      customerId: "rec5uaHZMOGZGyVcY",
    });
  });

  it("returns null for a malformed token", () => {
    expect(decodeSessionToken("not-a-real-jwt")).toBeNull();
  });
});

describe("homeRouteForRole", () => {
  it("sends a Customer Admin to /projects", () => {
    expect(homeRouteForRole("Customer Admin")).toBe("/projects");
  });

  it("sends a Streetleaf Admin to /customers", () => {
    expect(homeRouteForRole("Streetleaf Admin")).toBe("/customers");
  });

  it("defaults to /customers for an unknown or missing role", () => {
    expect(homeRouteForRole(undefined)).toBe("/customers");
    expect(homeRouteForRole(null)).toBe("/customers");
    expect(homeRouteForRole("Some Other Role")).toBe("/customers");
  });
});

describe("getSecondsUntilExpiry", () => {
  it("returns the remaining seconds until the token's exp claim", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = fakeJwt({ sub: "u1", role: "Customer Admin", exp: now + 3600 });

    const remaining = getSecondsUntilExpiry(token);

    // Allow a little slack for the time elapsed during the test itself.
    expect(remaining).toBeGreaterThan(3590);
    expect(remaining).toBeLessThanOrEqual(3600);
  });

  it("returns 0 (not negative) for an already-expired token", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = fakeJwt({ sub: "u1", role: "Customer Admin", exp: now - 3600 });

    expect(getSecondsUntilExpiry(token)).toBe(0);
  });

  it("returns null when the token has no exp claim", () => {
    const token = fakeJwt({ sub: "u1", role: "Customer Admin" });

    expect(getSecondsUntilExpiry(token)).toBeNull();
  });

  it("returns null for a malformed token", () => {
    expect(getSecondsUntilExpiry("not-a-real-jwt")).toBeNull();
  });
});
