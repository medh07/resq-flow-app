import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Chips, Meter, Page, Panel, SectionTitle, SevBadge, SimBadge, sevVar, Stat, timeAgo } from "@/components/kit";
import { MapView } from "@/components/MapView";
import { CENTER } from "@/lib/seed";
import { riskLevel, riskScore } from "@/lib/risk";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/risk")({
  head: () => seo("Population & Risk Grid", "Area risk levels with population, flood depth, damage and accessibility factors."),
  component: Risk,
});

type L = "risk" | "population" | "depth" | "damage" | "access";

function Risk() {
  const { zones, reports, shelters } = useApp();
  const [layer, setLayer] = useState<L>("risk");
  const [sel, setSel] = useState(zones[0]?.id);
  const z = zones.find((x) => x.id === sel);
  const shapes = useMemo(
    () =>
      zones.map((x) => {
        const v = { risk: riskScore(x).score / 100, population: x.population / 20000, depth: x.depthM / 2.5, damage: x.damageReports / 30, access: 1 - x.accessibility }[layer];
        return { id: x.id, kind: "circle" as const, center: [x.lat, x.lng] as [number, number], radius: x.radiusM, color: layer === "risk" ? sevVar[riskLevel(x)] : "var(--primary)", fillOpacity: layer === "risk" ? 0.35 : 0.1 + Math.min(0.6, v * 0.6), label: x.name, onClick: () => setSel(x.id) };
      }),
    [zones, layer],
  );
  const affected = zones.filter((x) => riskLevel(x) === "critical" || riskLevel(x) === "high").reduce((n, x) => n + x.population, 0);
  const shelterFree = shelters.filter((s) => s.kind === "shelter").reduce((n, s) => n + Math.max(0, s.capacity - s.occupancy), 0);

  return (
    <Page>
      <div className="mb-3 flex items-center gap-2"><SimBadge label="Estimates · demo data" /></div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="People in high-risk areas" value={`~${(affected / 1000).toFixed(1)}k`} sub="estimate" />
        <Stat label="Open SOS" value={reports.filter((r) => r.status === "reported").length} />
        <Stat label="Shelter spaces" value={shelterFree} />
      </div>
      <div className="mt-3"><Chips value={[layer]} onChange={(v) => v[0] && setLayer(v[0])} options={[{ v: "risk", l: "Risk level" }, { v: "population", l: "Population" }, { v: "depth", l: "Flood depth" }, { v: "damage", l: "Damage" }, { v: "access", l: "Accessibility" }]} /></div>
      <MapView center={CENTER} zoom={12} shapes={shapes} className="mt-3 h-72" />

      <SectionTitle>Areas</SectionTitle>
      <div className="space-y-2">
        {[...zones].sort((a, b) => riskScore(b).score - riskScore(a).score).map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} className="w-full text-left">
            <Panel className={`p-3 ${sel === x.id ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center gap-2"><b className="flex-1 text-sm">{x.name}</b><SevBadge s={riskLevel(x)} /><span className="text-sm font-bold">{riskScore(x).score}</span></div>
            </Panel>
          </button>
        ))}
      </div>

      {z && (
        <>
          <SectionTitle>Why {z.name} is {riskLevel(z)}</SectionTitle>
          <Panel className="space-y-3">
            {riskScore(z).factors.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between text-xs"><span>{f.label} <span className="text-muted-foreground">(weight {f.w})</span></span><b>{Math.round(f.value * 100)}%</b></div>
                <Meter value={f.value} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
              <div>Depth: <b>~{z.depthM} m</b></div>
              <div>Population: <b>~{z.population.toLocaleString()}</b></div>
              <div>Damage reports: <b>{z.damageReports}</b></div>
              <div>Confidence: <b>{Math.round(z.confidence * 100)}%</b></div>
              <div>Field observation: <b>{z.verifiedObs ? "Verified" : "Not verified"}</b></div>
              <div>Updated: <b>{timeAgo(z.updatedAt)}</b></div>
            </div>
            <p className="text-[11px] text-muted-foreground">Source: simulated scenario. Population and depth are modelled estimates, not census or gauge readings. Confidence below 30% is shown as “unknown”.</p>
          </Panel>
        </>
      )}
    </Page>
  );
}
