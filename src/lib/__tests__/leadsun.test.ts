import { describe, expect, it } from "vitest";
import { findLeadsunProduct, hasLeadsunProducts } from "@/lib/leadsun";
import type { LeadsunProject } from "@/lib/types";

const leadsunProject: LeadsunProject = {
  ProjectId: "545",
  ProjectName: "Manatee County - Buffalo Creek",
  UserName: "12081-FLManatee",
  groups: [
    {
      GroupId: 1263,
      GroupName: "Buffalo Creek",
      GatewayCode: "GT12L94A2310260A",
      products: [
        {
          ProductId: 12548,
          ProductName: "12081-1102",
          ControllerCode: "UPP40LA323110001",
          ProvidedProductId: "AEXSAP4323111877",
        },
        {
          ProductId: 12549,
          ProductName: "12081-1103",
          ControllerCode: "UPP40LA323110236",
          ProvidedProductId: "AEXSAP4323111878",
        },
      ],
    },
  ],
};

describe("hasLeadsunProducts", () => {
  it("is true when at least one group has at least one product", () => {
    expect(hasLeadsunProducts(leadsunProject)).toBe(true);
  });

  it("is false when every group has zero products", () => {
    expect(
      hasLeadsunProducts({ ...leadsunProject, groups: [{ ...leadsunProject.groups[0], products: [] }] }),
    ).toBe(false);
  });

  it("is false when there are no groups at all", () => {
    expect(hasLeadsunProducts({ ...leadsunProject, groups: [] })).toBe(false);
  });

  it("is false for null/undefined (no Leadsun project configured at all)", () => {
    expect(hasLeadsunProducts(null)).toBe(false);
    expect(hasLeadsunProducts(undefined)).toBe(false);
  });

  it("is true if any one of several groups has products, even if others don't", () => {
    expect(
      hasLeadsunProducts({
        ...leadsunProject,
        groups: [
          { ...leadsunProject.groups[0], products: [] },
          leadsunProject.groups[0],
        ],
      }),
    ).toBe(true);
  });
});

describe("findLeadsunProduct", () => {
  it("finds the product whose ProductName matches the given locationId", () => {
    const product = findLeadsunProduct(leadsunProject, "12081-1103");
    expect(product?.ProductId).toBe(12549);
    expect(product?.ControllerCode).toBe("UPP40LA323110236");
  });

  it("returns undefined when no product matches", () => {
    expect(findLeadsunProduct(leadsunProject, "no-such-location")).toBeUndefined();
  });

  it("returns undefined for a null/undefined leadsunProject", () => {
    expect(findLeadsunProduct(null, "12081-1103")).toBeUndefined();
    expect(findLeadsunProduct(undefined, "12081-1103")).toBeUndefined();
  });

  it("returns undefined for a null/undefined/empty locationId", () => {
    expect(findLeadsunProduct(leadsunProject, null)).toBeUndefined();
    expect(findLeadsunProduct(leadsunProject, undefined)).toBeUndefined();
    expect(findLeadsunProduct(leadsunProject, "")).toBeUndefined();
  });

  it("searches across every group, not just the first", () => {
    const secondGroupProject: LeadsunProject = {
      ...leadsunProject,
      groups: [
        { GroupId: 1, GroupName: "Empty", GatewayCode: "GW1", products: [] },
        leadsunProject.groups[0],
      ],
    };
    expect(findLeadsunProduct(secondGroupProject, "12081-1102")?.ProductId).toBe(12548);
  });

  it("does not crash if groups is missing entirely on an otherwise-truthy leadsunProject (regression: was throwing on .some/.find of undefined)", () => {
    // @ts-expect-error deliberately malformed to reproduce the crash this guards against
    const malformed: LeadsunProject = { ProjectId: "1", ProjectName: "X", UserName: "Y" };
    expect(() => hasLeadsunProducts(malformed)).not.toThrow();
    expect(hasLeadsunProducts(malformed)).toBe(false);
    expect(() => findLeadsunProduct(malformed, "12081-1102")).not.toThrow();
    expect(findLeadsunProduct(malformed, "12081-1102")).toBeUndefined();
  });

  it("does not crash if a group's products field is missing", () => {
    const malformedGroup = {
      GroupId: 1,
      GroupName: "X",
      GatewayCode: "GW1",
    } as LeadsunProject["groups"][number];
    const project: LeadsunProject = { ...leadsunProject, groups: [malformedGroup] };
    expect(() => hasLeadsunProducts(project)).not.toThrow();
    expect(hasLeadsunProducts(project)).toBe(false);
    expect(() => findLeadsunProduct(project, "12081-1102")).not.toThrow();
  });
});
