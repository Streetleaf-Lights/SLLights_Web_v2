import { NextRequest, NextResponse } from "next/server";
import { fetchLeadsunLampStatus } from "@/lib/leadsunClient";

export const dynamic = "force-dynamic";

/**
 * GET /api/leadsunlampstatus?projectId=X[&productId=Y] — proxies to
 * Leadsun's own live lamp-status API. The browser can't present a client
 * TLS certificate itself, so this route does it server-side and hands
 * back plain JSON; it also keeps the session check consistent with the
 * rest of this app's API routes, since this is live operational data tied
 * to a specific customer's poles.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in again." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const productId = searchParams.get("productId") ?? undefined;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  try {
    const lamps = await fetchLeadsunLampStatus(projectId, productId);
    return NextResponse.json(lamps);
  } catch (err) {
    // Without this, every failure (bad/missing cert, network/firewall
    // issue, Leadsun rejecting the request, unexpected response shape,
    // etc.) looked identical to the client and left no trace server-side —
    // undebuggable in practice. This is an internal tool, so surfacing the
    // real reason isn't a sensitive-data concern the way it might be on a
    // public-facing API.
    const detail = err instanceof Error ? err.message : String(err);
    console.error("GET /api/leadsunlampstatus failed:", detail);
    return NextResponse.json(
      { error: "Couldn't load live lamp status. Please try again.", detail },
      { status: 502 },
    );
  }
}
