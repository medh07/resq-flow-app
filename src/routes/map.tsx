import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { MapView, type MapMarker, type MapShape } from "@/components/MapView";
import { Chips, Page, Panel, SevBadge, SimBadge, sevVar, timeAgo, VerifiedBadge } from "@/components/kit";
import { CENTER } from "@/lib/seed";
import { riskLevel } from "@/lib/risk";
import type { Severity } from "@/lib/types";
import { seo } from "@/lib/seo";
import { X } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => seo("Crisis Heat Map", "Interactive flood map with incident markers, flood extent, shelters and rescue teams."),
  component: MapPage,
});

type Layer = "reports" | "flood" | "population" | "shelters" | "teams";
type Sel = { kind: "report" | "shelter" | "team" | "zone"; id: string } | null;

function MapPage() {
  const { reports, shelters, teams, zones, flood } = useApp();
  const [sev, setSev] = useState<Severity[]>(["critical", "high", "medium", "low"]);
  const [layers, setLayers] = useState<Layer[]>(["reports", "flood", "shelters"]);
  const [sel, setSel] = useState<Sel>(null);

  const visible = reports.filter((r) => sev.includes(r.severity));
  const { markers, shapes } = useMemo(() => {
    const m: MapMarker[] = [];
    const s: MapShape[] = [];
    if (layers.includes("flood"))
      zones.forEach((z) => s.push({ id: z.id, kind: "circle", center: [z.lat, z.lng], radius: z.radiusM, color: "var(--primary)", fillOpacity: Math.min(0.5, z.depthM / 4), label: `${z.name}: ~${z.depthM} m depth (simulated)`, onClick: () => setSel({ kind: "zone", id: z.id }) }));
    if (layers.includes("population"))
      zones.forEach((z) => s.push({ id: z.id + "p", kind: "circle", center: [z.lat, z.lng], radius: Math.sqrt(z.population) * 6, color: sevVar[riskLevel(z)], fillOpacity: 0.25, dashed: true, label: `${z.name}: ~${z.population.toLocaleString()} people (est.)`, onClick: () => setSel({ kind: "zone", id: z.id }) }));
    if (layers.includes("reports")) visible.forEach((r) => m.push({ id: r.id, lat: r.lat, lng: r.lng, color: sevVar[r.severity], label: `${r.id} · ${r.category}`, onClick: () => setSel({ kind: "report", id: r.id }) }));
    if (layers.includes("shelters")) shelters.forEach((x) => m.push({ id: x.id, lat: x.lat, lng: x.lng, color: x.kind === "medical" ? "var(--success)" : "var(--primary-deep)", size: 7, label: x.name, onClick: () => setSel({ kind: "shelter", id: x.id }) }));
    if (layers.includes("teams")) teams.forEach((t) => m.push({ id: t.id, lat: t.lat, lng: t.lng, color: t.available ? "var(--chart-2)" : "var(--sev-unknown)", size: 6, label: t.name, onClick: () => setSel({ kind: "team", id: t.id }) }));
    return { markers: m, shapes: s };
  }, [visible, layers, zones, shelters, teams]);

  return (
    <Page>
      <div className="mb-3 space-y-2">
        <Chips multi value={sev} onChange={setSev} options={[{ v: "critical", l: "Critical" }, { v: "high", l: "High" }, { v: "medium", l: "Medium" }, { v: "low", l: "Low" }]} />
        <Chips multi value={layers} onChange={setLayers} options={[{ v: "reports", l: "Reports" }, { v: "flood", l: "Flood extent" }, { v: "population", l: "Population" }, { v: "shelters", l: "Shelters" }, { v: "teams", l: "Teams" }]} />
      </div>
      <div className="relative">
        <MapView center={CENTER} zoom={13} markers={markers} shapes={shapes} className="h-[60vh]" />
        <div className="pointer-events-none absolute left-2 top-2 z-[400]"><SimBadge label={`Flood layer: ${flood.source.split(" (")[0]}`} /></div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Showing {visible.length} of {reports.length} reports. Tap a marker or area for details.</p>
      {sel && <Detail sel={sel} onClose={() => setSel(null)} />}
    </Page>
  );
}

function Detail({ sel, onClose }: { sel: NonNullable<Sel>; onClose: () => void }) {
  const s = useApp();
  let body: React.ReactNode = null;
  if (sel.kind === "report") {
    const r = s.reports.find((x) => x.id === sel.id)!;
    body = (
      <>
        <div className="flex gap-2"><SevBadge s={r.severity} /><VerifiedBadge v={r.verified} /></div>
        <div className="mt-2 font-bold">{r.place}</div>
        <p className="text-sm">{r.description}</p>
        <div className="mt-1 text-xs text-muted-foreground">{r.people} people · {timeAgo(r.createdAt)} · {r.status.replace("_", " ")}</div>
        <Link to="/operations/$id" params={{ id: r.id }} className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open incident</Link>
      </>
    );
  } else if (sel.kind === "shelter") {
    const x = s.shelters.find((y) => y.id === sel.id)!;
    body = (<><div className="font-bold">{x.name}</div><div className="text-sm">{x.capacity - x.occupancy} spaces free of {x.capacity}</div><Link to="/shelters" className="mt-2 inline-block text-sm font-semibold text-primary">Shelter directory →</Link></>);
  } else if (sel.kind === "team") {
    const t = s.teams.find((y) => y.id === sel.id)!;
    body = (<><div className="font-bold">{t.name}</div><div className="text-sm">{t.available ? "Available" : `Busy · ${t.assignment}`}</div><div className="text-xs text-muted-foreground">{t.skills.join(", ")} · {t.equipment.join(", ")}</div></>);
  } else {
    const z = s.zones.find((y) => y.id === sel.id)!;
    body = (<><div className="flex items-center gap-2 font-bold">{z.name}<SevBadge s={riskLevel(z)} /></div><div className="text-sm">~{z.depthM} m depth · ~{z.population.toLocaleString()} people (est.)</div><Link to="/risk" className="mt-2 inline-block text-sm font-semibold text-primary">Risk factors →</Link></>);
  }
  return (
    <Panel className="relative mt-3">
      <button aria-label="Close" onClick={onClose} className="absolute right-3 top-3"><X className="h-4 w-4" /></button>
      {body}
    </Panel>
  );
}
