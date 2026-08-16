// Domain model
//
// Hierarchy: Customer -> Project -> Pole
// Customers carry basic project name/id references inline (see
// CustomerProjectRef); the full Project record (poles under contract, dates,
// etc.) comes from a separate /getProjects?customerId= lookup. Users are
// managed separately (application accounts, not part of the customer hierarchy).

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

/**
 * A single pole's live status, as nested inside each project's vitals.
 * All telemetry fields are null for poles with no telemetry available (see
 * totalNonTelemetryAvailable on the parent project/customer).
 */
export interface PoleVital {
  id: string;
  poleNumber: string;
  locationId: string;
  isOnline: boolean | null;
  lightStatus: string | null;
  installDate: string | null;
  lat: number | null;
  long: number | null;
  lastUpdate: string | null;
  batteryVoltage1: number | null;
  batteryVoltage2: number | null;
  lampPower1: number | null;
  lampPower2: number | null;
  batteryElecCurrent1: number | null;
  batteryElecCurrent2: number | null;
  solarBoardVoltage: number | null;
  solarBoardElecCurrent: number | null;
  batteryChargingMin: number | null;
  isLedFault: boolean | null;
  isBatteryFault: boolean | null;
  isPanelFault: boolean | null;
  isOpenIssueFault: boolean | null;
  isPoleFault: boolean | null;
  avgBatteryPercentage: number | null;
  avgPanelPercentage: number | null;
  avgLightPercentage: number | null;
}

/** Vitals for a single project, as nested inside GET /getPoleVitals?customerId=... */
export interface ProjectVitals {
  id: string;
  name: string;
  totalLights: number;
  connectedLights: number;
  totalFaults: number;
  percentWorking: number;
  poles: PoleVital[];
}

/** Customer-level vitals from GET /getPoleVitals?customerId=..., with per-project breakdowns. */
export interface CustomerPoleVitals extends ProjectVitals {
  projects: ProjectVitals[];
}

/**
 * A pole from GET /getPoles?poleId=&projectId=&customerId= (all filters
 * optional). Same live-telemetry fields as PoleVital, plus the foreign keys
 * needed to link back into the Customer -> Project -> Pole hierarchy.
 */
export interface Pole extends PoleVital {
  customerId: string;
  projectId: string;
}

/**
 * Lightweight pole record from GET /getPoles?summary=true. The unfiltered
 * /getPoles response is capped at 1000 records without summary mode, but the
 * full system has ~14k poles — summary mode lifts that cap in exchange for
 * omitting lastUpdate and the two battery voltage fields.
 */
export type PoleSummary = Omit<PoleVital, "batteryVoltage1" | "batteryVoltage2"> & {
  customerId: string;
  projectId: string;
};

/** Valid periodType values for GET /getPoleVitalsByPeriod. */
export type PeriodType = "Hour" | "Day";

/** A single aggregated period's vitals, as returned by GET /getPoleVitalsByPeriod. */
export interface PoleVitalPeriod {
  periodStart: string;
  periodEnd: string;
  lightStatus: string | null;
  isOnline: boolean | null;
  avgBatteryPercentage: number | null;
  avgPanelPercentage: number | null;
  avgLightPercentage: number | null;
}

/** Response shape for GET /getPoleVitalsByPeriod?poleId=&periodType=&limit= */
export interface PoleVitalsByPeriod {
  id: string;
  poleNumber: string;
  locationId: string;
  installDate: string | null;
  lat: number | null;
  long: number | null;
  lastUpdate: string | null;
  vitals: PoleVitalPeriod[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  customerId: string | null;
  customerName: string | null;
}
