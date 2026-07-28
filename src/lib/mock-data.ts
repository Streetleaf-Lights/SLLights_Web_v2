import type { User } from "./types";

export const mockUsers: User[] = [
  {
    id: "user-01",
    name: "Dana Whitfield",
    email: "dana.whitfield@internal.co",
    role: "admin",
    active: true,
    lastActive: "2026-07-21",
  },
  {
    id: "user-02",
    name: "Marcus Ellery",
    email: "marcus.ellery@internal.co",
    role: "editor",
    active: true,
    lastActive: "2026-07-20",
  },
  {
    id: "user-03",
    name: "Priya Nandakumar",
    email: "priya.nandakumar@internal.co",
    role: "editor",
    active: true,
    lastActive: "2026-07-18",
  },
  {
    id: "user-04",
    name: "Colin Ashworth",
    email: "colin.ashworth@internal.co",
    role: "viewer",
    active: false,
    lastActive: "2026-05-30",
  },
];
