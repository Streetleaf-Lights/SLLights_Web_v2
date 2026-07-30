import { cookies } from "next/headers";
import { decodeSessionToken, type SessionUser } from "@/lib/auth-role";

export type { SessionUser } from "@/lib/auth-role";
export { decodeSessionToken, homeRouteForRole } from "@/lib/auth-role";

/** Reads the session cookie (Server Components / Route Handlers only) and decodes it. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return decodeSessionToken(token);
}
