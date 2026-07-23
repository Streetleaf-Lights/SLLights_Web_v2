import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs, customersCrumb } from "@/components/Breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders each crumb's label", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Customers", href: "/customers" },
          { label: "Coastal Power & Light", href: "/customers/r2" },
          { label: "Bayou District Rebuild" },
        ]}
      />,
    );
    expect(screen.getByText("Customers")).toBeInTheDocument();
    expect(screen.getByText("Coastal Power & Light")).toBeInTheDocument();
    expect(screen.getByText("Bayou District Rebuild")).toBeInTheDocument();
  });

  it("renders items with an href as links", () => {
    render(
      <Breadcrumbs
        items={[{ label: "Customers", href: "/customers" }, { label: "Not found" }]}
      />,
    );
    const link = screen.getByRole("link", { name: "Customers" });
    expect(link).toHaveAttribute("href", "/customers");
  });

  it("renders items without an href as plain text, not a link", () => {
    render(
      <Breadcrumbs
        items={[{ label: "Customers", href: "/customers" }, { label: "Not found" }]}
      />,
    );
    expect(screen.queryByRole("link", { name: "Not found" })).not.toBeInTheDocument();
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("carries query strings in hrefs (e.g. ?cust_q=coastal)", () => {
    render(
      <Breadcrumbs
        items={[{ label: "Customers", href: "/customers?cust_q=coastal" }, { label: "Detail" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute(
      "href",
      "/customers?cust_q=coastal",
    );
  });
});

describe("customersCrumb", () => {
  it("labels itself plain 'Customers' with no query", () => {
    expect(customersCrumb(undefined)).toEqual({ label: "Customers", href: "/customers" });
  });

  it("labels itself plain 'Customers' for an empty string query", () => {
    expect(customersCrumb("")).toEqual({ label: "Customers", href: "/customers" });
  });

  it("swaps to a 'Customer Search' label when a query is active", () => {
    expect(customersCrumb("coastal")).toEqual({
      label: "Customer Search: \u201ccoastal\u201d",
      href: "/customers?cust_q=coastal",
    });
  });

  it("URL-encodes the query in the href", () => {
    expect(customersCrumb("coastal power")).toEqual({
      label: "Customer Search: \u201ccoastal power\u201d",
      href: "/customers?cust_q=coastal%20power",
    });
  });
});
