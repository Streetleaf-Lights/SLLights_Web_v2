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

/** Where a person should land right after signing in/registering, or when redirected off a page they can't access. */
export function homeRouteForRole(role: string | null | undefined): string {
  return role === "Customer Admin" ? "/projects" : "/customers";
}
