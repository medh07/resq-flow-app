import { describe, expect, it } from "vitest";
import { simulateDrift, DEFAULT_DRIFT, distanceRangeKm } from "@/lib/drift";
import { rankSectors, DEFAULT_WEIGHTS } from "@/lib/priority";
import { makeSeed } from "@/lib/seed";

const now = Date.now();
const seed = makeSeed(now);
const c = seed.cases[0];
const hours = 5;
const sectors = simulateDrift(c, seed.flood, DEFAULT_DRIFT, hours);
const ctx = (over = {}) => ({ origin: [c.lastLat, c.lastLng] as [number, number], flowBearing: seed.flood.flowBearing, spread: 23.5, hours, now, observations: [], searches: [], teams: seed.teams, weights: DEFAULT_WEIGHTS, ...over });

describe("flood search logic", () => {
  it("produces multiple sectors whose plausibility shares sum to 1", () => {
    expect(sectors.length).toBe(4);
    expect(sectors.reduce((n, s) => n + s.plausibility, 0)).toBeCloseTo(1, 5);
  });
  it("downstream range grows with elapsed time", () => {
    expect(distanceRangeKm(seed.flood, DEFAULT_DRIFT, 10)[1]).toBeGreaterThan(distanceRangeKm(seed.flood, DEFAULT_DRIFT, 2)[1]);
  });
  it("an unsuccessful full search lowers that sector's priority", () => {
    const base = rankSectors(sectors, ctx()).find((r) => r.sector.id === sectors[1].id)!.score;
    const after = rankSectors(sectors, ctx({ searches: [{ id: "x", caseId: c.id, sectorId: sectors[1].id, outcome: "not_found", coverage: 1, at: now, note: "" }] })).find((r) => r.sector.id === sectors[1].id)!.score;
    expect(after).toBeLessThan(base);
  });
  it("a verified witness report inside a sector raises its priority", () => {
    const s = sectors[3];
    const base = rankSectors(sectors, ctx()).find((r) => r.sector.id === s.id)!.score;
    const after = rankSectors(sectors, ctx({ observations: [{ id: "o", caseId: c.id, lat: s.center[0], lng: s.center[1], note: "", at: now, verified: true, reliability: 1 }] })).find((r) => r.sector.id === s.id)!.score;
    expect(after).toBeGreaterThan(base);
  });
  it("priority scores stay within 0–100", () => {
    for (const r of rankSectors(sectors, ctx())) expect(r.score).toBeGreaterThanOrEqual(0), expect(r.score).toBeLessThanOrEqual(100);
  });
});
