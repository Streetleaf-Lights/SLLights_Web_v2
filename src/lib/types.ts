// Domain model
//
// Hierarchy: Customer -> Project -> Pole
// Customers carry basic project name/id references inline (see
// CustomerProjectRef); the full Project record (poles under contract, dates,
// etc.) comes from a separate /getProjects?customerId= lookup. Users are
// managed separately (application accounts, not part of the customer hierarchy).

export type PoleStatus = "active" | "planned" | "decommissioned" | "flagged";

export type UserRole = "admin" | "editor" | "viewer";

/** A project reference as carried inline on a Customer record. */
export interface CustomerProjectRef {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  name: string;
  projects: CustomerProjectRef[];
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  createdAt: string;
}

/** Full project record from GET /getProjects?customerId=... */
export interface Project {
  id: string;
  name: string;
  customerId: string;
  poleNumbers: string[];
  poleIds: string[];
  polesUnderContract: number;
  effectiveDate: string;
  installDates: string[];
  createdAt: string;
}

export interface Pole {
  id: string;
  assetTag: string;
  customerId: string;
  customerName: string;
  projectId: string;
  projectName: string;
  status: PoleStatus;
  material: string;
  heightFt: number;
  latitude: number;
  longitude: number;
  lastInspected: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastActive: string;
}
