import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UsersTable, initials } from "@/components/UsersTable";
import type { User } from "@/lib/types";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Dana Whitfield")).toBe("DW");
  });

  it("uppercases the result", () => {
    expect(initials("dana whitfield")).toBe("DW");
  });

  it("handles a single-word name", () => {
    expect(initials("Cher")).toBe("C");
  });

  it("caps at two characters for names with more than two words", () => {
    expect(initials("Mary Jane Watson")).toBe("MJ");
  });
});

describe("UsersTable", () => {
  const users: User[] = [
    {
      id: "u1",
      name: "Dana Whitfield",
      email: "dana.whitfield@internal.co",
      role: "admin",
      active: true,
      lastActive: "2026-07-21",
    },
    {
      id: "u2",
      name: "Colin Ashworth",
      email: "colin.ashworth@internal.co",
      role: "viewer",
      active: false,
      lastActive: "2026-05-30",
    },
  ];

  it("renders a row per user with name, email, and last active date", () => {
    render(<UsersTable users={users} />);
    expect(screen.getByText("Dana Whitfield")).toBeInTheDocument();
    expect(screen.getByText("dana.whitfield@internal.co")).toBeInTheDocument();
    expect(screen.getByText("2026-07-21")).toBeInTheDocument();
  });

  it("shows Active/Inactive based on the active flag", () => {
    render(<UsersTable users={users} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("shows the role badge", () => {
    render(<UsersTable users={users} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
  });

  it("renders no rows for an empty list", () => {
    render(<UsersTable users={[]} />);
    expect(screen.getAllByRole("row")).toHaveLength(1); // header row only
  });
});
