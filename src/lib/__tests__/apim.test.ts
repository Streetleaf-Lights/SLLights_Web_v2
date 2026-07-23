import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApimError,
  apimFetch,
  getCustomer,
  getCustomers,
  getPole,
  getPoles,
  getUsers,
  normalizeCustomer,
  parseJsonStringArray,
  type RawCustomer,
} from "@/lib/apim";

describe("parseJsonStringArray", () => {
  it("parses a JSON array string", () => {
    expect(parseJsonStringArray('["a","b"]')).toEqual(["a", "b"]);
  });

  it("returns an empty array for an empty array string", () => {
    expect(parseJsonStringArray("[]")).toEqual([]);
  });

  it("returns an empty array for null", () => {
    expect(parseJsonStringArray(null)).toEqual([]);
  });

  it("returns an empty array for undefined", () => {
    expect(parseJsonStringArray(undefined)).toEqual([]);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseJsonStringArray("not json")).toEqual([]);
  });

  it("returns an empty array when the parsed JSON isn't an array", () => {
    expect(parseJsonStringArray('{"a":1}')).toEqual([]);
  });

  it("coerces non-string array elements to strings", () => {
    expect(parseJsonStringArray("[1,2,3]")).toEqual(["1", "2", "3"]);
  });
});

describe("normalizeCustomer", () => {
  const raw: RawCustomer = {
    id: "rec123",
    name: "15LightYears",
    projectNames: JSON.stringify(["Bayou District Rebuild", "Storm Hardening"]),
    projectIds: JSON.stringify(["p1", "p2"]),
    address: "412 Harbor Ave",
    city: "New Orleans",
    state: "LA",
    zip: "70115",
    phone: "504-555-0132",
    createdAt: "2026-04-08 09:02:37-04:00",
  };

  it("zips projectNames and projectIds into project refs", () => {
    const customer = normalizeCustomer(raw);
    expect(customer.projects).toEqual([
      { id: "p1", name: "Bayou District Rebuild" },
      { id: "p2", name: "Storm Hardening" },
    ]);
  });

  it("passes through the scalar fields unchanged", () => {
    const customer = normalizeCustomer(raw);
    expect(customer.id).toBe("rec123");
    expect(customer.name).toBe("15LightYears");
    expect(customer.address).toBe("412 Harbor Ave");
    expect(customer.city).toBe("New Orleans");
    expect(customer.state).toBe("LA");
    expect(customer.zip).toBe("70115");
    expect(customer.phone).toBe("504-555-0132");
    expect(customer.createdAt).toBe("2026-04-08 09:02:37-04:00");
  });

  it("returns an empty projects array when projectNames/projectIds are empty", () => {
    const customer = normalizeCustomer({ ...raw, projectNames: "[]", projectIds: "[]" });
    expect(customer.projects).toEqual([]);
  });

  it("falls back to a generated id if projectIds is shorter than projectNames", () => {
    const customer = normalizeCustomer({
      ...raw,
      projectNames: JSON.stringify(["Only Name"]),
      projectIds: "[]",
    });
    expect(customer.projects).toEqual([{ id: "rec123-project-0", name: "Only Name" }]);
  });

  it("passes through null fields as null", () => {
    const customer = normalizeCustomer({
      ...raw,
      address: null,
      city: null,
      state: null,
      zip: null,
      phone: null,
    });
    expect(customer.address).toBeNull();
    expect(customer.city).toBeNull();
    expect(customer.state).toBeNull();
    expect(customer.zip).toBeNull();
    expect(customer.phone).toBeNull();
  });
});

describe("apimFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the subscription key header and parses JSON on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "1" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apimFetch<{ id: string }[]>("/getCustomers");

    expect(result).toEqual([{ id: "1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/getCustomers");
    expect(init.headers).toHaveProperty("Ocp-Apim-Subscription-Key");
  });

  it("throws an ApimError when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    await expect(apimFetch("/getCustomers")).rejects.toThrow(ApimError);
  });

  it("includes the HTTP status on the thrown ApimError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    try {
      await apimFetch("/getCustomers");
      throw new Error("expected apimFetch to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApimError);
      expect((err as ApimError).status).toBe(401);
    }
  });
});

describe("getCustomers / getCustomer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const rawCustomers: RawCustomer[] = [
    {
      id: "r1",
      name: "15LightYears",
      projectNames: "[]",
      projectIds: "[]",
      address: null,
      city: null,
      state: "FL",
      zip: null,
      phone: null,
      createdAt: "2026-04-08 09:02:37-04:00",
    },
    {
      id: "r2",
      name: "Coastal Power & Light",
      projectNames: JSON.stringify(["Bayou District Rebuild"]),
      projectIds: JSON.stringify(["p1"]),
      address: null,
      city: "New Orleans",
      state: "LA",
      zip: null,
      phone: "504-555-0132",
      createdAt: "2026-02-11 14:20:05-05:00",
    },
  ];

  it("getCustomers normalizes every record from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rawCustomers }),
    );

    const customers = await getCustomers();

    expect(customers).toHaveLength(2);
    expect(customers[1].projects).toEqual([{ id: "p1", name: "Bayou District Rebuild" }]);
  });

  it("getCustomer finds a customer by id from the full list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rawCustomers }),
    );

    const customer = await getCustomer("r2");

    expect(customer?.name).toBe("Coastal Power & Light");
  });

  it("getCustomer returns undefined when no customer matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rawCustomers }),
    );

    const customer = await getCustomer("does-not-exist");

    expect(customer).toBeUndefined();
  });
});

describe("Poles and Users (stubbed)", () => {
  it("getPoles resolves with the mock pole list", async () => {
    const poles = await getPoles();
    expect(poles.length).toBeGreaterThan(0);
  });

  it("getPole finds a pole by id", async () => {
    const poles = await getPoles();
    const pole = await getPole(poles[0].id);
    expect(pole?.id).toBe(poles[0].id);
  });

  it("getPole returns undefined for an unknown id", async () => {
    const pole = await getPole("does-not-exist");
    expect(pole).toBeUndefined();
  });

  it("getUsers resolves with the mock user list", async () => {
    const users = await getUsers();
    expect(users.length).toBeGreaterThan(0);
  });
});
