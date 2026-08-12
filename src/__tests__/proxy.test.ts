import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function encodePayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `header.${encodePayload(payload)}.signature`;
}

function request(path: string, { sessionToken }: { sessionToken?: string } = {}) {
  return new NextRequest(`http://localhost${path}`, {
    headers: sessionToken ? { cookie: `session=${sessionToken}` } : {},
  });
}

function isRedirectTo(response: Response, path: string): boolean {
  return response.status === 307 && new URL(response.headers.get("location")!).pathname === path;
}

function isPassthrough(response: Response): boolean {
  return response.headers.get("x-middleware-next") === "1";
}

const customerAdminToken = fakeJwt({
  sub: "1445C5D1-37C2-43CF-9F82-6223F425B265",
  role: "Customer Admin",
  customerId: "rec5uaHZMOGZGyVcY",
});

const streetleafAdminToken = fakeJwt({
  sub: "6496D8A1-7A59-4673-9C29-BB522B94CD28",
  role: "Streetleaf Admin",
  customerId: null,
});

describe("proxy", () => {
  it("lets /signin through with no session", () => {
    const res = proxy(request("/signin"));
    expect(isPassthrough(res)).toBe(true);
  });

  it("lets /register through with no session", () => {
    const res = proxy(request("/register"));
    expect(isPassthrough(res)).toBe(true);
  });

  it("lets /forgot-password through with no session", () => {
    const res = proxy(request("/forgot-password"));
    expect(isPassthrough(res)).toBe(true);
  });

  it("lets /reset-password through with no session", () => {
    const res = proxy(request("/reset-password"));
    expect(isPassthrough(res)).toBe(true);
  });

  it("redirects to /signin when there is no session cookie", () => {
    const res = proxy(request("/customers"));
    expect(isRedirectTo(res, "/signin")).toBe(true);
  });

  it("redirects to /signin when the session cookie is malformed", () => {
    const res = proxy(request("/customers", { sessionToken: "not-a-real-jwt" }));
    expect(isRedirectTo(res, "/signin")).toBe(true);
  });

  it("lets a Streetleaf Admin through to /customers", () => {
    const res = proxy(request("/customers", { sessionToken: streetleafAdminToken }));
    expect(isPassthrough(res)).toBe(true);
  });

  it("lets a Streetleaf Admin through to any customer's detail page", () => {
    const res = proxy(
      request("/customers/some-other-customer/projects/p1", {
        sessionToken: streetleafAdminToken,
      }),
    );
    expect(isPassthrough(res)).toBe(true);
  });

  it("redirects a Customer Admin away from the Customers list", () => {
    const res = proxy(request("/customers", { sessionToken: customerAdminToken }));
    expect(isRedirectTo(res, "/projects")).toBe(true);
  });

  it("redirects a Customer Admin away from another customer's detail page", () => {
    const res = proxy(
      request("/customers/some-other-customer/projects/p1", {
        sessionToken: customerAdminToken,
      }),
    );
    expect(isRedirectTo(res, "/projects")).toBe(true);
  });

  it("lets a Customer Admin through to their own customer's detail page", () => {
    const res = proxy(
      request("/customers/rec5uaHZMOGZGyVcY/projects/p1", { sessionToken: customerAdminToken }),
    );
    expect(isPassthrough(res)).toBe(true);
  });

  it("lets a Customer Admin through to their own customer's pole detail page", () => {
    const res = proxy(
      request("/customers/rec5uaHZMOGZGyVcY/projects/p1/poles/pole1", {
        sessionToken: customerAdminToken,
      }),
    );
    expect(isPassthrough(res)).toBe(true);
  });

  it("sends a signed-in Customer Admin from / to /projects", () => {
    const res = proxy(request("/", { sessionToken: customerAdminToken }));
    expect(isRedirectTo(res, "/projects")).toBe(true);
  });

  it("lets a Customer Admin through to /poles and /users", () => {
    expect(isPassthrough(proxy(request("/poles", { sessionToken: customerAdminToken })))).toBe(
      true,
    );
    expect(isPassthrough(proxy(request("/users", { sessionToken: customerAdminToken })))).toBe(
      true,
    );
  });

  it("lets a Customer Admin through to /projects", () => {
    const res = proxy(request("/projects", { sessionToken: customerAdminToken }));
    expect(isPassthrough(res)).toBe(true);
  });

  it("redirects a Streetleaf Admin away from /projects", () => {
    const res = proxy(request("/projects", { sessionToken: streetleafAdminToken }));
    expect(isRedirectTo(res, "/customers")).toBe(true);
  });
});
