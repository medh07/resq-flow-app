import type { RiskZone, Severity } from "./types";

export function riskScore(z: RiskZone) {
  const depth = Math.min(1, z.depthM / 2.5);
  const pop = Math.min(1, z.population / 20000);
  const dmg = Math.min(1, z.damageReports / 30);
  const access = 1 - z.accessibility;
  const score = Math.round(100 * (0.4 * depth + 0.25 * pop + 0.2 * dmg + 0.15 * access));
  return {
    score,
    factors: [
      { label: "Flood depth", value: depth, w: 0.4 },
      { label: "Population exposed", value: pop, w: 0.25 },
      { label: "Damage reports", value: dmg, w: 0.2 },
      { label: "Poor accessibility", value: access, w: 0.15 },
    ],
  };
}

export function riskLevel(z: RiskZone): Severity {
  if (z.confidence < 0.3) return "unknown";
  const s = riskScore(z).score;
  if (s >= 70) return "critical";
  if (s >= 50) return "high";
  if (s >= 30) return "medium";
  return "low";
}
