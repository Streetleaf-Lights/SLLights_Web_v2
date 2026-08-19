export interface SessionUser {
  id: string;
  role: string;
  customerId: string | null;
}

/**
 * Decodes the JWT payload from a session token — deliberately no signature
 * verification, since we're not the one issuing/signing these tokens
 * (APIM is), and adding real verification would mean duplicating its
 * signing secret here. This is used for both:
 *  - display decisions (sidebar links, the Invite User button)
 *  - route enforcement in proxy.ts (blocking /customers for a Customer
 *    Admin, scoping /customers/{id} to their own id)
 *
 * A tampered/forged token would still fail every real APIM call, since
 * those are authorized independently via the Bearer token on each
 * request — so at worst a forged cookie could change what this app
 * *shows or navigates to*, not what data it can actually read or write.
 *
 * Kept dependency-free (no next/headers) so it's safe to import from
 * client components too (e.g. SignInForm picking a post-login redirect).
 */
export function decodeSessionToken(token: string): SessionUser | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);
    if (typeof payload?.sub !== "string" || typeof payload?.role !== "string") return null;

    return {
      id: payload.sub,
      role: payload.role,
      customerId: typeof payload.customerId === "string" ? payload.customerId : null,
    };
  } catch {
    return null;
  }
}

/**
 * True for anyone scoped to exactly one customer's data: a Customer
 * Admin, or a "Customer User" (a plain "User" role that does belong to a
 * customer). False for anyone with full cross-customer visibility: a
 * Streetleaf Admin, or a "Streetleaf User" (a plain "User" with no
 * customer). Drives sidebar link visibility, the Customers/Projects route
 * enforcement in proxy.ts, home-route redirects, and the Poles/Projects
 * pages' own data scoping — kept here as the single source of truth so
 * those can't drift out of sync with each other.
 */
export function isCustomerScoped(
  role: string | null | undefined,
  customerId: string | null | undefined,
): boolean {
  return role === "Customer Admin" || (role === "User" && customerId != null);
}

/** Where a person should land right after signing in/registering, or when redirected off a page they can't access. */
export function homeRouteForRole(
  role: string | null | undefined,
  customerId?: string | null,
): string {
  return isCustomerScoped(role, customerId) ? "/projects" : "/customers";
}

/**
 * Seconds remaining until the JWT's own `exp` claim, for sizing the
 * session cookie's maxAge to match — otherwise a hardcoded guess can
 * outlive the token itself (the cookie stays in the browser looking
 * "signed in" while APIM has already invalidated the token, so every
 * authenticated call starts failing with "session expired" well before
 * the cookie would naturally clear). Returns null if the token can't be
 * decoded or has no exp claim, so the caller can fall back to a default.
 */
export function getSecondsUntilExpiry(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);
    if (typeof payload?.exp !== "number") return null;

    const secondsRemaining = payload.exp - Math.floor(Date.now() / 1000);
    return secondsRemaining > 0 ? secondsRemaining : 0;
  } catch {
    return null;
  }
}
