// Domain model
//
// Hierarchy: Customer -> Project -> Pole
// Users are managed separately (application accounts, not part of the customer hierarchy).

export type PoleStatus = "active" | "planned" | "decommissioned" | "flagged";

export type CustomerStatus = "active" | "inactive";

export type UserRole = "admin" | "editor" | "viewer";

export interface Customer {
  id: string;
  name: string;
  accountCode: string;
  region: string;
  status: CustomerStatus;
  projectCount: number;
  poleCount: number;
  updatedAt: string;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  code: string;
  poleCount: number;
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
