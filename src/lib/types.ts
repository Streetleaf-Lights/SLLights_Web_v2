// Domain model
//
// Hierarchy: Customer -> Project -> Pole
// Customers carry their project names/ids inline (see CustomerProjectRef) rather
// than through a separate Project resource. Users are managed separately
// (application accounts, not part of the customer hierarchy).

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
