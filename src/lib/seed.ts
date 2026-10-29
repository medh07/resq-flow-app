// SIMULATED demo data for Guwahati / Brahmaputra floodplain. Not live readings.
import type {
  Dispatch, FloodConditions, InventoryItem, MissingCase, Observation, Org, Report, RiskZone,
  SearchRecord, Shelter, Task, Team, Update,
} from "./types";

const H = 3.6e6;
export const CENTER: [number, number] = [26.175, 91.76];

export function makeSeed(now: number) {
  const rep = (p: Partial<Report> & Pick<Report, "id" | "category" | "severity" | "lat" | "lng" | "place" | "description">, agoH: number, status: Report["status"] = "reported"): Report => ({
    lifeThreatening: p.severity === "critical",
    people: 3,
    anonymous: false,
    createdAt: now - agoH * H,
    status,
    verified: status !== "reported",
    equipment: [],
    history: [{ status: "reported", at: now - agoH * H }],
    simulated: true,
    ...p,
  });
  const reports: Report[] = [
    rep({ id: "R-1042", category: "rescue", severity: "critical", lat: 26.181, lng: 91.745, place: "Pandu, Ward 4", description: "Family of 5 on rooftop, water rising past first floor.", people: 5, contactName: "Ritu D.", contactPhone: "98xxxx1120" }, 1.5, "verified"),
    rep({ id: "R-1043", category: "medical", severity: "high", lat: 26.165, lng: 91.775, place: "Fatasil Ambari", description: "Elderly diabetic patient needs insulin, roads cut off.", people: 1 }, 3),
    rep({ id: "R-1044", category: "food", severity: "medium", lat: 26.152, lng: 91.79, place: "Lokhra relief point", description: "120 people without food for a day.", people: 120 }, 6, "assigned"),
    rep({ id: "R-1045", category: "water", severity: "high", lat: 26.19, lng: 91.72, place: "Jalukbari low-lying lane", description: "Drinking water contaminated, children with diarrhoea.", people: 40, anonymous: true }, 4),
    rep({ id: "R-1046", category: "utilities", severity: "low", lat: 26.17, lng: 91.8, place: "Zoo Road", description: "Fallen electric pole, area cordoned.", people: 0 }, 9, "rescued"),
    rep({ id: "R-1047", category: "shelter", severity: "medium", lat: 26.14, lng: 91.74, place: "Garchuk", description: "30 households need temporary shelter.", people: 110 }, 7, "en_route"),
    rep({ id: "R-1048", category: "missing", severity: "critical", lat: 26.186, lng: 91.752, place: "Maligaon ghat", description: "Teenager swept away near ghat steps.", people: 1 }, 5, "verified"),
  ];
  reports.forEach((r) => {
    const idx = ["reported", "verified", "assigned", "en_route", "rescued", "handover"].indexOf(r.status);
    r.history = ["reported", "verified", "assigned", "en_route", "rescued", "handover"].slice(0, idx + 1).map((s, i) => ({ status: s as Report["status"], at: r.createdAt + i * 0.4 * H }));
  });
  reports[2]!.teamId = "T-2";
  reports[5]!.teamId = "T-4";

  const cases: MissingCase[] = [
    { id: "MC-07", name: "Arjun B. (age 15)", age: 15, description: "Blue school shirt, black trousers, ~165 cm.", lastLat: 26.186, lastLng: 91.752, lastPlace: "Maligaon ghat steps", lastSeenAt: now - 5 * H, status: "active", createdAt: now - 4.5 * H, simulated: true },
    { id: "MC-08", name: "Unidentified adult male", description: "Red raincoat, seen holding onto debris.", lastLat: 26.195, lastLng: 91.79, lastPlace: "Uzan Bazar riverfront", lastSeenAt: now - 14 * H, status: "active", createdAt: now - 13 * H, simulated: true },
  ];
  const flood: FloodConditions = {
    source: "Simulated scenario (no live gauge connected)",
    observedAt: now - 2 * H,
    simulated: true,
    flowBearing: 265,
    velocityMin: 0.8,
    velocityMax: 2.2,
    depthM: 1.6,
    extentKm2: 38,
  };
  const observations: Observation[] = [
    { id: "O-1", caseId: "MC-07", lat: 26.184, lng: 91.733, note: "Fisherman saw a person in blue near floating bamboo.", at: now - 3 * H, verified: false, reliability: 0.6 },
    { id: "O-2", caseId: "MC-07", lat: 26.1835, lng: 91.744, note: "School bag recovered at bank (verified by police).", at: now - 2 * H, verified: true, reliability: 0.9 },
    { id: "O-3", caseId: "MC-08", lat: 26.19, lng: 91.74, note: "Red cloth caught on fence, unconfirmed.", at: now - 8 * H, verified: false, reliability: 0.4 },
  ];
  const searches: SearchRecord[] = [
    { id: "SR-1", caseId: "MC-07", sectorId: "MC-07-S1", teamId: "T-3", outcome: "not_found", coverage: 0.7, at: now - 3.5 * H, note: "Ghat and adjoining lanes swept." },
  ];
  const teams: Team[] = [
    { id: "T-1", name: "NDRF Boat Unit Alpha", skills: ["swiftwater", "first aid"], equipment: ["inflatable boat", "life jackets", "rope"], available: true, lat: 26.18, lng: 91.77, members: 8 },
    { id: "T-2", name: "SDRF Bravo", skills: ["ground search", "first aid"], equipment: ["stretcher", "torch"], available: false, lat: 26.155, lng: 91.785, members: 6, assignment: "R-1044" },
    { id: "T-3", name: "Civil Defence K9", skills: ["ground search", "k9"], equipment: ["K9 dogs", "drone"], available: true, lat: 26.188, lng: 91.755, members: 4 },
    { id: "T-4", name: "Volunteer Rafters", skills: ["swiftwater"], equipment: ["raft boat", "life jackets"], available: false, lat: 26.14, lng: 91.745, members: 5, assignment: "R-1047" },
    { id: "T-5", name: "Medical Response 1", skills: ["first aid", "paramedic"], equipment: ["medical kit", "ambulance"], available: true, lat: 26.16, lng: 91.77, members: 3 },
  ];
  const tasks: Task[] = [
    { id: "TK-1", title: "Distribute food packets at Lokhra", kind: "relief", location: "Lokhra relief point", needs: ["logistics"], status: "in_progress", assignee: "SDRF Bravo", progress: 0.5, createdAt: now - 5 * H },
    { id: "TK-2", title: "Deliver insulin to Fatasil Ambari", kind: "medical", location: "Fatasil Ambari", needs: ["first aid", "boat"], status: "open", progress: 0, createdAt: now - 2 * H },
    { id: "TK-3", title: "Shelter registration desk", kind: "relief", location: "Cotton College shelter", needs: ["data entry"], status: "open", progress: 0, createdAt: now - 6 * H },
    { id: "TK-4", title: "Water purification tablets — Jalukbari", kind: "relief", location: "Jalukbari", needs: ["logistics"], status: "completed", assignee: "Asha (you)", progress: 1, createdAt: now - 20 * H },
  ];
  const inventory: InventoryItem[] = [
    { id: "I-1", name: "Food packets", unit: "packs", qty: 860, min: 500 },
    { id: "I-2", name: "Drinking water", unit: "L", qty: 1200, min: 2000 },
    { id: "I-3", name: "Medical kits", unit: "kits", qty: 42, min: 30 },
    { id: "I-4", name: "Life jackets", unit: "pcs", qty: 18, min: 40 },
    { id: "I-5", name: "Rescue boats", unit: "boats", qty: 4, min: 3 },
    { id: "I-6", name: "Blankets", unit: "pcs", qty: 310, min: 200 },
  ];
  const dispatches: Dispatch[] = [
    { id: "D-1", itemId: "I-1", qty: 200, destination: "Lokhra relief point", vehicle: "AS01 TR 4411", status: "in_transit", createdAt: now - 2 * H },
    { id: "D-2", itemId: "I-6", qty: 80, destination: "Garchuk shelter", vehicle: "AS01 BK 2290", status: "delivered", createdAt: now - 9 * H },
  ];
  const shelters: Shelter[] = [
    { id: "SH-1", name: "Cotton College Hall", kind: "shelter", lat: 26.186, lng: 91.744 + 0.04, capacity: 400, occupancy: 362, facilities: ["toilets", "kitchen", "power"], accessible: true, updatedAt: now - 1 * H },
    { id: "SH-2", name: "Garchuk Govt School", kind: "shelter", lat: 26.142, lng: 91.738, capacity: 250, occupancy: 251, facilities: ["toilets"], accessible: false, updatedAt: now - 10 * H },
    { id: "SH-3", name: "Beltola Community Centre", kind: "shelter", lat: 26.13, lng: 91.8, capacity: 300, occupancy: 140, facilities: ["toilets", "kitchen", "ramp"], accessible: true, updatedAt: now - 3 * H },
    { id: "MD-1", name: "GMCH Flood Medical Camp", kind: "medical", lat: 26.158, lng: 91.765, capacity: 60, occupancy: 48, facilities: ["ambulance"], services: ["trauma", "dehydration", "maternity"], accessible: true, updatedAt: now - 0.5 * H, medicalUrgent: 7 },
    { id: "MD-2", name: "Pandu Mobile Clinic", kind: "medical", lat: 26.175, lng: 91.735, capacity: 20, occupancy: 9, facilities: [], services: ["first aid", "ORS"], accessible: true, updatedAt: now - 7 * H, medicalUrgent: 2 },
  ];
  const updates: Update[] = [
    { id: "U-1", kind: "evacuation", title: "Evacuate low-lying areas of Pandu & Maligaon", body: "Move to Cotton College Hall or Beltola Community Centre. Carry documents and medicines.", source: "District Disaster Mgmt Authority (demo)", verified: true, at: now - 2 * H },
    { id: "U-2", kind: "alert", title: "River level above danger mark (simulated)", body: "Demo scenario: Brahmaputra at Guwahati assumed 0.8 m above danger level. No live gauge is connected.", source: "Simulated scenario", verified: false, at: now - 3 * H },
    { id: "U-3", kind: "notice", title: "Boil drinking water", body: "Boil water for at least 1 minute or use chlorine tablets distributed at relief points.", source: "Health Dept (demo)", verified: true, at: now - 8 * H },
  ];
  const orgs: Org[] = [
    { id: "OG-1", name: "Brahmaputra Relief Trust", area: "Kamrup Metro", verified: true, focus: "Food & shelter" },
    { id: "OG-2", name: "Assam Youth Rafters", area: "Riverfront wards", verified: false, focus: "Water rescue" },
  ];
  const zones: RiskZone[] = [
    { id: "Z-1", name: "Pandu", lat: 26.18, lng: 91.74, radiusM: 1200, population: 18000, depthM: 2.1, damageReports: 24, accessibility: 0.2, verifiedObs: true, confidence: 0.8, updatedAt: now - 1 * H },
    { id: "Z-2", name: "Maligaon", lat: 26.165, lng: 91.705 + 0.05, radiusM: 1000, population: 12000, depthM: 1.4, damageReports: 12, accessibility: 0.5, verifiedObs: true, confidence: 0.7, updatedAt: now - 2 * H },
    { id: "Z-3", name: "Jalukbari", lat: 26.19, lng: 91.715, radiusM: 1100, population: 9000, depthM: 1.0, damageReports: 6, accessibility: 0.6, verifiedObs: false, confidence: 0.5, updatedAt: now - 5 * H },
    { id: "Z-4", name: "Uzan Bazar", lat: 26.192, lng: 91.79, radiusM: 900, population: 15000, depthM: 0.6, damageReports: 4, accessibility: 0.8, verifiedObs: true, confidence: 0.75, updatedAt: now - 3 * H },
    { id: "Z-5", name: "Garchuk", lat: 26.14, lng: 91.74, radiusM: 1000, population: 7000, depthM: 0.4, damageReports: 2, accessibility: 0.9, verifiedObs: false, confidence: 0.6, updatedAt: now - 6 * H },
    { id: "Z-6", name: "North Bank char", lat: 26.205, lng: 91.75, radiusM: 1300, population: 4000, depthM: 1.8, damageReports: 0, accessibility: 0.1, verifiedObs: false, confidence: 0.2, updatedAt: now - 20 * H },
  ];
  return { reports, cases, flood, observations, searches, teams, tasks, inventory, dispatches, shelters, updates, orgs, zones };
}
