import { afterEach, describe, expect, it, vi } from "vitest";

const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }));

vi.mock("@/lib/apim", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apim")>("@/lib/apim");
  return {
    ...actual,
    signIn: signInMock,
  };
});

import { ApimError } from "@/lib/apim";
import { POST } from "@/app/api/signin/route";

function request(body: unknown) {
  return new Request("http://localhost/api/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/signin", () => {
  afterEach(() => {
    signInMock.mockReset();
  });

  const authUser = {
    id: "6496D8A1-7A59-4673-9C29-BB522B94CD28",
    name: "Minh Tran",
    email: "minh@streetleaf.com",
    role: "Streetleaf Admin",
    customerId: null,
  };

  it("returns the user (not the token) on success", async () => {
    signInMock.mockResolvedValue({ token: "jwt-token", user: authUser });

    const res = await POST(request({ email: "minh@streetleaf.com", password: "hunter2" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ user: authUser });
    expect(JSON.stringify(body)).not.toContain("jwt-token");
  });

  it("sets the token as an httpOnly session cookie, never exposed to client JS", async () => {
    signInMock.mockResolvedValue({ token: "jwt-token", user: authUser });

    const res = await POST(request({ email: "minh@streetleaf.com", password: "hunter2" }));

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("session=jwt-token");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });

  it("forwards the APIM error message and status on invalid credentials", async () => {
    signInMock.mockRejectedValue(new ApimError("invalid email or password", 401));

    const res = await POST(request({ email: "minh@streetleaf.com", password: "wrong" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "invalid email or password" });
  });

  it("returns a generic 500 for unexpected non-ApimError failures", async () => {
    signInMock.mockRejectedValue(new Error("boom"));

    const res = await POST(request({ email: "minh@streetleaf.com", password: "hunter2" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Sign in failed. Please try again.");
  });

  it("rejects missing email/password with 400 before calling signIn", async () => {
    const res = await POST(request({ email: "", password: "" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Email and password are required.");
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed JSON body with 400", async () => {
    const badRequest = new Request("http://localhost/api/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(badRequest);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Malformed request body.");
  });
});
