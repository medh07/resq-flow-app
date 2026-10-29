export type Role = "citizen" | "volunteer" | "manager";
export type Severity = "critical" | "high" | "medium" | "low" | "unknown";
export type Category =
  | "food"
  | "medical"
  | "shelter"
  | "water"
  | "rescue"
  | "utilities"
  | "missing"
  | "other";
export type ReportStatus = "reported" | "verified" | "assigned" | "en_route" | "rescued" | "handover";
export const REPORT_FLOW: ReportStatus[] = ["reported", "verified", "assigned", "en_route", "rescued", "handover"];

export interface Report {
  id: string;
  category: Category;
  severity: Severity;
  lifeThreatening: boolean;
  people: number;
  description: string;
  lat: number;
  lng: number;
  place: string;
  contactName?: string | undefined;
  contactPhone?: string | undefined;
  anonymous: boolean;
  image?: string | undefined;
  createdAt: number;
  status: ReportStatus;
  verified: boolean;
  teamId?: string | undefined;
  equipment: string[];
  history: { status: ReportStatus; at: number }[];
  simulated: boolean;
}

export interface MissingCase {
  id: string;
  name: string;
  age?: number | undefined;
  description: string;
  lastLat: number;
  lastLng: number;
  lastPlace: string;
  lastSeenAt: number;
  status: "active" | "found" | "closed";
  createdAt: number;
  simulated: boolean;
}

export interface FloodConditions {
  source: string;
  observedAt: number;
  simulated: boolean;
  flowBearing: number; // degrees, direction water flows toward
  velocityMin: number; // m/s
  velocityMax: number;
  depthM: number;
  extentKm2: number;
}

export interface Observation {
  id: string;
  caseId: string;
  lat: number;
  lng: number;
  note: string;
  at: number;
  verified: boolean;
  reliability: number; // 0-1
}

export type Outcome = "not_found" | "partial" | "found_evidence" | "found_person" | "inaccessible";
export interface SearchRecord {
  id: string;
  caseId: string;
  sectorId: string;
  teamId?: string | undefined;
  outcome: Outcome;
  coverage: number; // 0-1
  at: number;
  note: string;
}

export interface Team {
  id: string;
  name: string;
  skills: string[];
  equipment: string[];
  available: boolean;
  lat: number;
  lng: number;
  members: number;
  assignment?: string | undefined;
}

export interface Task {
  id: string;
  title: string;
  kind: "rescue" | "search" | "relief" | "medical";
  location: string;
  needs: string[];
  status: "open" | "assigned" | "in_progress" | "completed";
  assignee?: string | undefined;
  caseId?: string | undefined;
  sectorId?: string | undefined;
  progress: number;
  createdAt: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  min: number;
}
export interface Dispatch {
  id: string;
  itemId: string;
  qty: number;
  destination: string;
  vehicle: string;
  status: "packed" | "in_transit" | "delivered";
  createdAt: number;
}

export interface Shelter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  occupancy: number;
  facilities: string[];
  accessible: boolean;
  updatedAt: number;
  kind: "shelter" | "medical";
  services?: string[] | undefined;
  medicalUrgent?: number | undefined;
}

export interface Update {
  id: string;
  title: string;
  body: string;
  kind: "notice" | "alert" | "evacuation";
  source: string;
  verified: boolean;
  at: number;
}

export interface Org {
  id: string;
  name: string;
  area: string;
  verified: boolean;
  focus: string;
}

export interface RiskZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  population: number;
  depthM: number;
  damageReports: number;
  accessibility: number; // 0-1
  verifiedObs: boolean;
  confidence: number;
  updatedAt: number;
}

export interface PriorityWeights {
  plausibility: number;
  evidence: number;
  urgency: number;
  accessibility: number;
  searchPenalty: number;
  resources: number;
}

export const STATUS_LABEL: Record<ReportStatus, string> = { reported: "Reported", verified: "Verified", assigned: "Team assigned", en_route: "En route", rescued: "Rescued / resolved", handover: "Medical handover" };
