import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

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

  it("carries query strings in hrefs (e.g. ?q=coastal)", () => {
    render(
      <Breadcrumbs
        items={[{ label: "Customers", href: "/customers?q=coastal" }, { label: "Detail" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute(
      "href",
      "/customers?q=coastal",
    );
  });
});
