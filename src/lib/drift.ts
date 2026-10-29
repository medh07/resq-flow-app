// Transparent, deterministic drift SIMULATION. Not a validated hydrological model.
// Replace `simulateDrift` with validated hydrology / remote-sensing output later.
import type { FloodConditions, MissingCase } from "./types";

export interface DriftParams {
  driftFactorMin: number; // fraction of surface velocity a person/object travels (assumption)
  driftFactorMax: number;
  spreadDeg: number; // lateral angular uncertainty
  maxKm: number;
}
export const DEFAULT_DRIFT: DriftParams = { driftFactorMin: 0.15, driftFactorMax: 0.6, spreadDeg: 22, maxKm: 30 };

export interface Sector {
  id: string;
  label: string;
  kind: "origin" | "downstream_near" | "downstream_far" | "bank_eddy";
  polygon: [number, number][];
  center: [number, number];
  distKm: [number, number];
  plausibility: number; // relative model share (sums to 1), NOT probability of finding
  baseAccess: number;
  hazard: number;
  assumptions: string;
}

const R = 111320;
export function offset(lat: number, lng: number, bearingDeg: number, meters: number): [number, number] {
  const b = (bearingDeg * Math.PI) / 180;
  const dy = Math.cos(b) * meters;
  const dx = Math.sin(b) * meters;
  return [lat + dy / R, lng + dx / (R * Math.cos((lat * Math.PI) / 180))];
}
export function distanceM(a: [number, number], b: [number, number]) {
  const dy = (b[0] - a[0]) * R;
  const dx = (b[1] - a[1]) * R * Math.cos((a[0] * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}
export function bearing(a: [number, number], b: [number, number]) {
  const dy = (b[0] - a[0]) * R;
  const dx = (b[1] - a[1]) * R * Math.cos((a[0] * Math.PI) / 180);
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}
function angleDiff(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Downstream distance range (km) after `hours`. */
export function distanceRangeKm(f: FloodConditions, p: DriftParams, hours: number): [number, number] {
  const min = (f.velocityMin * p.driftFactorMin * 3600 * hours) / 1000;
  const max = (f.velocityMax * p.driftFactorMax * 3600 * hours) / 1000;
  return [Math.min(min, p.maxKm), Math.min(max, p.maxKm)];
}

function wedge(o: [number, number], b: number, spread: number, r0: number, r1: number): [number, number][] {
  const pts: [number, number][] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) pts.push(offset(o[0], o[1], b - spread + (2 * spread * i) / steps, r1));
  for (let i = steps; i >= 0; i--) pts.push(offset(o[0], o[1], b - spread + (2 * spread * i) / steps, Math.max(r0, 1)));
  return pts;
}
function circle(o: [number, number], r: number): [number, number][] {
  return Array.from({ length: 24 }, (_, i) => offset(o[0], o[1], i * 15, r));
}

export function simulateDrift(c: MissingCase, f: FloodConditions, p: DriftParams, hours: number): Sector[] {
  const o: [number, number] = [c.lastLat, c.lastLng];
  const [dmin, dmax] = distanceRangeKm(f, p, Math.max(hours, 0.25));
  const dmid = (dmin + dmax) / 2;
  const spread = p.spreadDeg + Math.min(hours, 48) * 0.3;
  const originR = Math.max(300, Math.min(1200, dmin * 1000 * 0.4));
  const raw = {
    origin: 0.1 + 0.8 * Math.exp(-hours / 6),
    near: 0.9,
    far: 0.4 + 0.3 * (1 - Math.exp(-hours / 12)),
    bank: 0.5,
  };
  const sum = raw.origin + raw.near + raw.far + raw.bank;
  const bankCenter = offset(...offset(o[0], o[1], f.flowBearing, dmid * 600), f.flowBearing - 90, 400);
  return [
    {
      id: `${c.id}-S1`,
      label: "S1 · Around last-known point",
      kind: "origin",
      polygon: circle(o, originR),
      center: o,
      distKm: [0, originR / 1000],
      plausibility: raw.origin / sum,
      baseAccess: 0.8,
      hazard: 0.6,
      assumptions: "Person may be stranded or sheltering near where last seen. Share decays with elapsed time (e-fold 6 h).",
    },
    {
      id: `${c.id}-S2`,
      label: "S2 · Downstream near channel",
      kind: "downstream_near",
      polygon: wedge(o, f.flowBearing, spread, originR, dmid * 1000),
      center: offset(o[0], o[1], f.flowBearing, ((originR / 1000 + dmid) / 2) * 1000),
      distKm: [originR / 1000, dmid],
      plausibility: raw.near / sum,
      baseAccess: 0.55,
      hazard: 1,
      assumptions: `Drift at ${p.driftFactorMin}–${p.driftFactorMax}× surface velocity, ±${spread.toFixed(0)}° lateral spread.`,
    },
    {
      id: `${c.id}-S3`,
      label: "S3 · Downstream far reach",
      kind: "downstream_far",
      polygon: wedge(o, f.flowBearing, spread, dmid * 1000, Math.max(dmax, dmid + 0.2) * 1000),
      center: offset(o[0], o[1], f.flowBearing, ((dmid + dmax) / 2) * 1000),
      distKm: [dmid, dmax],
      plausibility: raw.far / sum,
      baseAccess: 0.4,
      hazard: 1,
      assumptions: "Upper bound assumes sustained max velocity and continuous drift — least likely to hold.",
    },
    {
      id: `${c.id}-S4`,
      label: "S4 · Bank & eddy catchment",
      kind: "bank_eddy",
      polygon: circle(bankCenter, 450),
      center: bankCenter,
      distKm: [dmid * 0.6 - 0.45, dmid * 0.6 + 0.45],
      plausibility: raw.bank / sum,
      baseAccess: 0.7,
      hazard: 0.75,
      assumptions: "Slower water on the inside bank where debris and people commonly collect.",
    },
  ];
}

export function pointInSector(s: Sector, pt: [number, number], origin: [number, number], flowBearing: number, spread: number) {
  if (s.kind === "origin") return distanceM(s.center, pt) <= s.distKm[1] * 1000;
  if (s.kind === "bank_eddy") return distanceM(s.center, pt) <= 450;
  const d = distanceM(origin, pt) / 1000;
  return d >= s.distKm[0] && d <= s.distKm[1] && angleDiff(bearing(origin, pt), flowBearing) <= spread;
}

export function effectiveSpread(p: DriftParams, hours: number) {
  return p.spreadDeg + Math.min(hours, 48) * 0.3;
}

export function driftPaths(c: MissingCase, f: FloodConditions, p: DriftParams, hours: number) {
  const o: [number, number] = [c.lastLat, c.lastLng];
  const spread = effectiveSpread(p, hours);
  const [dmin, dmax] = distanceRangeKm(f, p, hours);
  const mid = (dmin + dmax) / 2;
  return [
    { label: "Slow drift", bearing: f.flowBearing - spread * 0.6, km: dmin },
    { label: "Central scenario", bearing: f.flowBearing, km: mid },
    { label: "Fast drift", bearing: f.flowBearing + spread * 0.6, km: dmax },
  ].map((s) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 8; i++) pts.push(offset(o[0], o[1], s.bearing + Math.sin(i / 2) * 4, (s.km * 1000 * i) / 8));
    return { ...s, points: pts };
  });
}
