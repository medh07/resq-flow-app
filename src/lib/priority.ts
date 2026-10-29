// Search Priority Score: a configurable operational ranking (0–100).
// It is NOT a probability of finding the person.
import type { Observation, PriorityWeights, SearchRecord, Team } from "./types";
import { distanceM, pointInSector, type Sector } from "./drift";

export const DEFAULT_WEIGHTS: PriorityWeights = {
  plausibility: 3,
  evidence: 3,
  urgency: 2,
  accessibility: 1.5,
  searchPenalty: 0.7,
  resources: 1,
};

export interface Factor {
  key: keyof PriorityWeights;
  label: string;
  value: number;
  note: string;
}
export interface RankedSector {
  sector: Sector;
  score: number;
  factors: Factor[];
  coverage: number;
  reasons: string[];
  evidenceCount: number;
}

export function caseUrgency(hours: number) {
  // Survival-window style urgency: high early, tapering after 72h (assumption, configurable via weight)
  return Math.max(0.3, Math.min(1, 1 - (hours - 12) / 120));
}

export function rankSectors(
  sectors: Sector[],
  ctx: {
    origin: [number, number];
    flowBearing: number;
    spread: number;
    hours: number;
    now: number;
    observations: Observation[];
    searches: SearchRecord[];
    teams: Team[];
    weights: PriorityWeights;
  },
): RankedSector[] {
  const maxPl = Math.max(...sectors.map((s) => s.plausibility));
  const urg = caseUrgency(ctx.hours);
  const avail = ctx.teams.filter((t) => t.available);
  const ranked = sectors.map((s) => {
    const inside = ctx.observations.filter((o) => pointInSector(s, [o.lat, o.lng], ctx.origin, ctx.flowBearing, ctx.spread));
    // Evidence: each observation counted once, weighted by reliability, verification and recency; saturates at 1.
    let ev = 0;
    for (const o of inside) {
      const ageH = (ctx.now - o.at) / 3.6e6;
      ev += o.reliability * (o.verified ? 1 : 0.4) * Math.exp(-ageH / 12);
    }
    const recs = ctx.searches.filter((r) => r.sectorId === s.id);
    const foundEv = recs.some((r) => r.outcome === "found_evidence");
    if (foundEv) ev += 0.5;
    ev = Math.min(1, ev);
    // Coverage of unsuccessful searches combines as 1 - Π(1 - c)
    const neg = recs.filter((r) => r.outcome === "not_found" || r.outcome === "partial");
    const coverage = 1 - neg.reduce((p, r) => p * (1 - r.coverage * (r.outcome === "partial" ? 0.5 : 1)), 1);
    const inaccessible = recs.some((r) => r.outcome === "inaccessible");
    const access = inaccessible ? s.baseAccess * 0.3 : s.baseAccess;
    const needsBoat = s.kind === "downstream_near" || s.kind === "downstream_far";
    const capable = avail.filter((t) => !needsBoat || t.equipment.some((e) => /boat/i.test(e)));
    const res = Math.min(1, capable.length / 2);
    const pl = s.plausibility / maxPl;
    const u = urg * s.hazard;
    const w = ctx.weights;
    const positive = w.plausibility * pl + w.evidence * ev + w.urgency * u + w.accessibility * access + w.resources * res;
    const denom = w.plausibility + w.evidence + w.urgency + w.accessibility + w.resources || 1;
    const penalty = Math.min(0.95, w.searchPenalty * coverage);
    const score = Math.round(100 * (positive / denom) * (1 - penalty));
    const reasons: string[] = [];
    if (pl > 0.8) reasons.push("Highest model plausibility share under current flow assumptions");
    if (ev > 0.3) reasons.push(`${inside.length} witness report(s)${foundEv ? " + physical evidence" : ""} inside sector`);
    if (u > 0.8) reasons.push("Fast water and early in survival window — time-critical");
    if (coverage > 0.3) reasons.push(`Down-weighted: ${Math.round(coverage * 100)}% already searched without result`);
    if (inaccessible) reasons.push("Marked inaccessible by a field team");
    if (res < 0.5) reasons.push(needsBoat ? "Few available teams with boats" : "Few available teams");
    if (!reasons.length) reasons.push("Balanced across factors; no strong signal");
    return {
      sector: s,
      score,
      coverage,
      reasons,
      evidenceCount: inside.length,
      factors: [
        { key: "plausibility", label: "Model plausibility", value: pl, note: `${Math.round(s.plausibility * 100)}% relative share` },
        { key: "evidence", label: "Evidence", value: ev, note: `${inside.length} obs` },
        { key: "urgency", label: "Urgency", value: u, note: `${ctx.hours.toFixed(1)} h elapsed` },
        { key: "accessibility", label: "Accessibility", value: access, note: inaccessible ? "reported blocked" : "estimated" },
        { key: "resources", label: "Team capacity", value: res, note: `${capable.length} suitable available` },
        { key: "searchPenalty", label: "Prior search coverage", value: coverage, note: "reduces score" },
      ] as Factor[],
    };
  });
  return ranked.sort((a, b) => b.score - a.score);
}

export function recommendTeams(sector: Sector, teams: Team[]) {
  const needsBoat = sector.kind === "downstream_near" || sector.kind === "downstream_far";
  return teams
    .filter((t) => t.available)
    .map((t) => {
      let s = 0;
      const why: string[] = [];
      const boat = t.equipment.some((e) => /boat/i.test(e));
      if (needsBoat) {
        if (boat) (s += 40), why.push("has boat");
        else s -= 30;
        if (t.skills.includes("swiftwater")) (s += 25), why.push("swiftwater trained");
      } else {
        if (t.skills.includes("ground search")) (s += 35), why.push("ground search");
        if (t.skills.includes("k9")) (s += 15), why.push("K9 unit");
      }
      if (t.skills.includes("first aid")) (s += 10), why.push("first aid");
      const km = distanceM([t.lat, t.lng], sector.center) / 1000;
      s += Math.max(0, 25 - km * 3);
      why.push(`${km.toFixed(1)} km away`);
      return { team: t, score: Math.round(s), why };
    })
    .sort((a, b) => b.score - a.score);
}
