import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApimError,
  apimFetch,
  getCustomer,
  getCustomers,
  getPole,
  getPoleVitalsForCustomer,
  getPoles,
  getProjectsForCustomer,
  getUsers,
  normalizeCustomer,
  normalizeProject,
  parseJsonStringArray,
  type RawCustomer,
  type RawProject,
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

  it("caches responses with a revalidate window instead of forcing no-store", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await apimFetch("/getCustomers");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.cache).not.toBe("no-store");
    expect(init.next).toEqual(expect.objectContaining({ revalidate: expect.any(Number) }));
    expect(init.next.revalidate).toBeGreaterThan(0);
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

describe("getCustomers", () => {
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

  it("normalizes every record from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rawCustomers }),
    );

    const customers = await getCustomers();

    expect(customers).toHaveLength(2);
    expect(customers[1].projects).toEqual([{ id: "p1", name: "Bayou District Rebuild" }]);
  });
});

describe("getCustomer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const rawCoastal: RawCustomer = {
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
  };

  it("calls /getCustomers with a customerId filter rather than fetching the full list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => rawCoastal });
    vi.stubGlobal("fetch", fetchMock);

    await getCustomer("r2");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/getCustomers?customerId=r2");
  });

  it("normalizes the record returned as a single object", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rawCoastal }),
    );

    const customer = await getCustomer("r2");

    expect(customer?.name).toBe("Coastal Power & Light");
    expect(customer?.projects).toEqual([{ id: "p1", name: "Bayou District Rebuild" }]);
  });

  it("returns undefined when the API returns null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => null }));

    const customer = await getCustomer("does-not-exist");

    expect(customer).toBeUndefined();
  });

  it("URL-encodes the id in the query string", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => null });
    vi.stubGlobal("fetch", fetchMock);

    await getCustomer("rec with space");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("customerId=rec%20with%20space");
  });
});

describe("normalizeProject", () => {
  const raw: RawProject = {
    id: "recRHN9eR4itukKGo",
    name: "29N Greene - Creekside Amenity-VA",
    poleNumbers: JSON.stringify(["51079-1000", "51079-1001", "51079-1002", "51079-1003"]),
    poleIds: JSON.stringify([
      "rec1NE6PGdnlNfDTL",
      "rec2GKUi0g856OAqC",
      "rec70ph1TOQ07WoK9",
      "rec0763poEAWiWIiE",
    ]),
    customerId: "recRYzYBqtW5CIVhn",
    polesUnderContract: 4,
    effectiveDate: "2024-11-25",
    installDates: JSON.stringify(["2025-05-23"]),
    createdAt: "2024-12-13 12:02:12-05:00",
  };

  it("parses poleNumbers/poleIds/installDates from their JSON-stringified form", () => {
    const project = normalizeProject(raw);
    expect(project.poleNumbers).toEqual([
      "51079-1000",
      "51079-1001",
      "51079-1002",
      "51079-1003",
    ]);
    expect(project.poleIds).toEqual([
      "rec1NE6PGdnlNfDTL",
      "rec2GKUi0g856OAqC",
      "rec70ph1TOQ07WoK9",
      "rec0763poEAWiWIiE",
    ]);
    expect(project.installDates).toEqual(["2025-05-23"]);
  });

  it("passes through the scalar fields unchanged", () => {
    const project = normalizeProject(raw);
    expect(project.id).toBe("recRHN9eR4itukKGo");
    expect(project.name).toBe("29N Greene - Creekside Amenity-VA");
    expect(project.customerId).toBe("recRYzYBqtW5CIVhn");
    expect(project.polesUnderContract).toBe(4);
    expect(project.effectiveDate).toBe("2024-11-25");
    expect(project.createdAt).toBe("2024-12-13 12:02:12-05:00");
  });
});

describe("getProjectsForCustomer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const rawProjects: RawProject[] = [
    {
      id: "recRHN9eR4itukKGo",
      name: "29N Greene - Creekside Amenity-VA",
      poleNumbers: JSON.stringify(["51079-1000"]),
      poleIds: JSON.stringify(["rec1NE6PGdnlNfDTL"]),
      customerId: "recRYzYBqtW5CIVhn",
      polesUnderContract: 4,
      effectiveDate: "2024-11-25",
      installDates: JSON.stringify(["2025-05-23"]),
      createdAt: "2024-12-13 12:02:12-05:00",
    },
  ];

  it("calls /getProjects with a customerId filter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => rawProjects });
    vi.stubGlobal("fetch", fetchMock);

    await getProjectsForCustomer("recRYzYBqtW5CIVhn");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/getProjects?customerId=recRYzYBqtW5CIVhn");
  });

  it("normalizes every project returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rawProjects }),
    );

    const projects = await getProjectsForCustomer("recRYzYBqtW5CIVhn");

    expect(projects).toHaveLength(1);
    expect(projects[0].polesUnderContract).toBe(4);
    expect(projects[0].poleNumbers).toEqual(["51079-1000"]);
  });

  it("URL-encodes the customerId in the query string", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    await getProjectsForCustomer("rec with space");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("customerId=rec%20with%20space");
  });
});

describe("getPoleVitalsForCustomer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const rawVitals = {
    id: "recD6nliOfFlp0VFh",
    name: "Acacia Fields CDD",
    totalLights: 88,
    workingPercentage: 89.77,
    optimisticWorkingPercentage: 100.0,
    totalFaults: 0,
    totalNonTelemetryAvailable: 9,
    projects: [
      {
        id: "reczugRdlKOZ6ehTn",
        name: "Acacia Fields CDD - Boger Ph 1A Ph 1B",
        totalLights: 54,
        workingPercentage: 90.74,
        optimisticWorkingPercentage: 100.0,
        totalFaults: 0,
        totalNonTelemetryAvailable: 5,
      },
      {
        id: "recZWPEWVW3gLSqJm",
        name: "Acacia Fields CDD - Plazewski",
        totalLights: 34,
        workingPercentage: 88.24,
        optimisticWorkingPercentage: 100.0,
        totalFaults: 0,
        totalNonTelemetryAvailable: 4,
      },
    ],
  };

  it("calls /getPoleVitals with a customerId filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => rawVitals });
    vi.stubGlobal("fetch", fetchMock);

    await getPoleVitalsForCustomer("recD6nliOfFlp0VFh");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/getPoleVitals?customerId=recD6nliOfFlp0VFh");
  });

  it("returns the customer-level vitals with the nested per-project breakdown intact", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => rawVitals }),
    );

    const vitals = await getPoleVitalsForCustomer("recD6nliOfFlp0VFh");

    expect(vitals?.totalLights).toBe(88);
    expect(vitals?.optimisticWorkingPercentage).toBe(100.0);
    expect(vitals?.totalFaults).toBe(0);
    expect(vitals?.projects).toHaveLength(2);
    expect(vitals?.projects[0]).toMatchObject({
      id: "reczugRdlKOZ6ehTn",
      totalLights: 54,
      optimisticWorkingPercentage: 100.0,
    });
  });

  it("returns undefined when the API returns null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => null }));

    const vitals = await getPoleVitalsForCustomer("does-not-exist");

    expect(vitals).toBeUndefined();
  });

  it("URL-encodes the customerId in the query string", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => null });
    vi.stubGlobal("fetch", fetchMock);

    await getPoleVitalsForCustomer("rec with space");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("customerId=rec%20with%20space");
  });
});

describe("getPoles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Matches the real /getPoles?summary=true shape: no lastUpdate, no
  // batteryVoltage1/2 (those only come back from the full, non-summary form).
  const rawSummaryPole = {
    id: "recmb0TRqqEmAnT9T",
    poleNumber: "TEC-2691",
    locationId: "11439",
    installDate: "2025-04-22",
    lat: 0.0,
    long: 0.0,
    lightStatus: null,
    isOnline: null,
    avgBatteryPercentage: null,
    avgPanelPercentage: null,
    avgLightPercentage: null,
    projectId: "rec08jIrGQcE5tmNb",
    customerId: "recwx649JfiRmWqxF",
  };

  it("always includes summary=true, to lift the 1000-row cap on the ~14k poles", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [rawSummaryPole] });
    vi.stubGlobal("fetch", fetchMock);

    await getPoles();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/getPoles?summary=true");
  });

  it("returns the poles as-is (already matches our PoleSummary shape)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => [rawSummaryPole] }),
    );

    const poles = await getPoles();

    expect(poles).toHaveLength(1);
    expect(poles[0]).toMatchObject({
      id: "recmb0TRqqEmAnT9T",
      poleNumber: "TEC-2691",
      customerId: "recwx649JfiRmWqxF",
      projectId: "rec08jIrGQcE5tmNb",
    });
    // Summary responses don't have these — confirm we don't invent them.
    expect(poles[0]).not.toHaveProperty("lastUpdate");
    expect(poles[0]).not.toHaveProperty("batteryVoltage1");
    expect(poles[0]).not.toHaveProperty("batteryVoltage2");
  });

  it("applies the customerId filter alongside summary=true", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [rawSummaryPole] });
    vi.stubGlobal("fetch", fetchMock);

    await getPoles({ customerId: "recwx649JfiRmWqxF" });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("customerId=recwx649JfiRmWqxF");
    expect(url).toContain("summary=true");
  });

  it("applies the projectId filter alongside summary=true", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [rawSummaryPole] });
    vi.stubGlobal("fetch", fetchMock);

    await getPoles({ projectId: "rec3ZJtlb5vqkHPS1" });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("projectId=rec3ZJtlb5vqkHPS1");
    expect(url).toContain("summary=true");
  });

  it("applies multiple filters together, alongside summary=true", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [rawSummaryPole] });
    vi.stubGlobal("fetch", fetchMock);

    await getPoles({ customerId: "cust1", projectId: "proj1" });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("customerId=cust1");
    expect(url).toContain("projectId=proj1");
    expect(url).toContain("summary=true");
  });
});

describe("getPole", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const rawPole = {
    id: "recFrbkdOnCqdCDjt",
    poleNumber: "12057-2689033877",
    locationId: "TEC-2689033877",
    installDate: "2022-04-06",
    lat: 27.74143766,
    long: -82.40508593,
    lastUpdate: "2026-07-26 15:17:14+00:00",
    batteryVoltage1: 13.409,
    batteryVoltage2: 13.619,
    lightStatus: "DayLight",
    isOnline: true,
    avgBatteryPercentage: 80.06,
    avgPanelPercentage: 19.32,
    avgLightPercentage: 0.0,
    projectId: "rec3ZJtlb5vqkHPS1",
    customerId: "recwx649JfiRmWqxF",
  };

  it("filters /getPoles by poleId", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [rawPole] });
    vi.stubGlobal("fetch", fetchMock);

    await getPole("recFrbkdOnCqdCDjt");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/getPoles?poleId=recFrbkdOnCqdCDjt");
  });

  it("returns the first (only) matching pole", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [rawPole] }));

    const pole = await getPole("recFrbkdOnCqdCDjt");

    expect(pole?.id).toBe("recFrbkdOnCqdCDjt");
  });

  it("returns undefined when no pole matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    const pole = await getPole("does-not-exist");

    expect(pole).toBeUndefined();
  });
});

describe("Users (stubbed)", () => {
  it("getUsers resolves with the mock user list", async () => {
    const users = await getUsers();
    expect(users.length).toBeGreaterThan(0);
  });
});
