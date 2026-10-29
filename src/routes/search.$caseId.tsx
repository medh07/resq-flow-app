import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pause, Play, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { Chips, Meter, Page, Panel, SectionTitle, SimBadge, timeAgo, VerifiedBadge } from "@/components/kit";
import { MapView, type MapMarker, type MapShape } from "@/components/MapView";
import { distanceRangeKm, driftPaths, effectiveSpread, simulateDrift } from "@/lib/drift";
import { rankSectors, recommendTeams, DEFAULT_WEIGHTS } from "@/lib/priority";
import { Slider } from "@/components/ui/slider";
import type { Outcome, PriorityWeights } from "@/lib/types";
import { useEffect } from "react";
import { canPlanSearch } from "@/lib/roles";

export const Route = createFileRoute("/search/$caseId")({
  head: ({ params }) => ({
    meta: [
      { title: `Search case ${params.caseId} · ResQ-Flow` },
      { name: "description", content: "Simulated drift sectors, ranked search zones and team recommendations." },
      { property: "og:title", content: `Search case ${params.caseId} · ResQ-Flow` },
      { property: "og:description", content: "Simulated drift sectors, ranked search zones and team recommendations." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CasePage,
});

const SECTOR_COLORS = ["var(--sev-critical)", "var(--sev-high)", "var(--sev-medium)", "var(--chart-2)"];
const OUTCOMES: { v: Outcome; l: string }[] = [
  { v: "not_found", l: "Searched – nothing" },
  { v: "partial", l: "Partially searched" },
  { v: "found_evidence", l: "Evidence found" },
  { v: "inaccessible", l: "Inaccessible" },
  { v: "found_person", l: "Person found" },
];
const field = "w-full rounded-xl border bg-card px-3 py-2 text-sm";

function CasePage() {
  const { caseId } = Route.useParams();
  const st = useApp();
  const c = st.cases.find((x) => x.id === caseId);
  const [tab, setTab] = useState<"intel" | "plan" | "evidence" | "teams">("intel");
  const elapsed = c ? (Date.now() - c.lastSeenAt) / 3.6e6 : 0;
  const [t, setT] = useState(elapsed);
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState(["lkp", "paths", "sectors", "flood", "obs"]);
  const [pick, setPick] = useState<[number, number] | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => setT((v) => (v >= elapsed + 12 ? 0.5 : v + 0.5)), 350);
    return () => clearInterval(h);
  }, [playing, elapsed]);

  const obs = st.observations.filter((o) => o.caseId === caseId);
  const recs = st.searches.filter((s) => s.caseId === caseId);
  const sectors = useMemo(() => (c ? simulateDrift(c, st.flood, st.drift, elapsed) : []), [c, st.flood, st.drift, elapsed]);
  const ranked = useMemo(
    () => (c ? rankSectors(sectors, { origin: [c.lastLat, c.lastLng], flowBearing: st.flood.flowBearing, spread: effectiveSpread(st.drift, elapsed), hours: elapsed, now: Date.now(), observations: obs, searches: recs, teams: st.teams, weights: st.weights }) : []),
    [sectors, c, st.flood, st.drift, elapsed, obs, recs, st.teams, st.weights],
  );
  const playSectors = useMemo(() => (c ? simulateDrift(c, st.flood, st.drift, t) : []), [c, st.flood, st.drift, t]);
  const paths = useMemo(() => (c ? driftPaths(c, st.flood, st.drift, t) : []), [c, st.flood, st.drift, t]);

  if (!c) return <Page><Panel>Case not found. <Link to="/search" className="text-primary">Back</Link></Panel></Page>;
  const canManage = canPlanSearch(st.user.role);
  const range = distanceRangeKm(st.flood, st.drift, elapsed);
  const freshH = (Date.now() - st.flood.observedAt) / 3.6e6;

  const shapes: MapShape[] = [];
  const markers: MapMarker[] = [];
  if (layers.includes("flood")) shapes.push({ id: "flood", kind: "circle", center: [c.lastLat, c.lastLng], radius: Math.sqrt(st.flood.extentKm2 / Math.PI) * 1000, color: "var(--primary)", fillOpacity: 0.08, label: `Flood extent ~${st.flood.extentKm2} km² (simulated)` });
  if (layers.includes("sectors"))
    playSectors.forEach((s, i) => {
      const r = ranked.find((x) => x.sector.id === s.id);
      shapes.push({ id: s.id, kind: "polygon", points: s.polygon, color: SECTOR_COLORS[r ? ranked.indexOf(r) : i] ?? SECTOR_COLORS[i], fillOpacity: focus === s.id ? 0.45 : 0.22, label: `${s.label} · priority ${r?.score ?? "-"}`, onClick: () => setFocus(s.id) });
    });
  if (layers.includes("paths")) paths.forEach((p, i) => shapes.push({ id: "p" + i, kind: "line", points: p.points, color: "var(--primary-deep)", dashed: i !== 1, label: `${p.label}: ${p.km.toFixed(1)} km at t=${t.toFixed(1)} h (simulated)` }));
  if (layers.includes("lkp")) markers.push({ id: "lkp", lat: c.lastLat, lng: c.lastLng, color: "var(--emergency)", size: 10, label: "Last-known location (reported)" });
  if (layers.includes("obs")) obs.forEach((o) => markers.push({ id: o.id, lat: o.lat, lng: o.lng, color: o.verified ? "var(--success)" : "var(--warning)", size: 7, label: o.note }));
  if (pick) markers.push({ id: "pick", lat: pick[0], lng: pick[1], color: "var(--foreground)", size: 7, label: "New report location" });

  return (
    <Page>
      <Panel>
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{c.name}</h2>{c.simulated && <SimBadge label="Demo case" />}<span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold capitalize text-secondary-foreground">{c.status}</span></div>
        <p className="text-sm text-muted-foreground">{c.description}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-muted p-2"><b className="block text-sm">{c.lastPlace}</b>last known</div>
          <div className="rounded-xl bg-muted p-2"><b className="block text-sm">{new Date(c.lastSeenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>last seen</div>
          <div className="rounded-xl bg-emergency/10 p-2 text-emergency"><b className="block text-sm">{elapsed.toFixed(1)} h</b>elapsed</div>
        </div>
      </Panel>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-warning/15 p-3 text-xs">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
        Sectors and drift paths are simulated estimates for planning. They do not identify the person's location.
      </div>

      <div className="mt-3"><Chips value={[tab]} onChange={(v) => v[0] && setTab(v[0])} options={[{ v: "intel", l: "Flood & drift" }, { v: "plan", l: "Search priority" }, { v: "evidence", l: "Evidence" }, { v: "teams", l: "Teams & history" }]} /></div>

      <div className="mt-3">
        <Chips multi value={layers} onChange={setLayers} options={[{ v: "lkp", l: "Last known" }, { v: "paths", l: "Drift paths" }, { v: "sectors", l: "Sectors" }, { v: "flood", l: "Flood extent" }, { v: "obs", l: "Witness reports" }]} />
        <MapView center={[c.lastLat, c.lastLng]} zoom={13} shapes={shapes} markers={markers} className="mt-2 h-72" onPick={tab === "evidence" ? (a, b) => setPick([a, b]) : undefined} />
        <div className="mt-2 flex items-center gap-3">
          <button aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)} className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
          <Slider value={[t]} min={0.5} max={Math.max(elapsed + 12, 6)} step={0.5} onValueChange={(v) => setT(v[0])} className="flex-1" />
          <span className="w-24 text-right text-xs font-semibold">t = {t.toFixed(1)} h{Math.abs(t - elapsed) < 0.3 ? " (now)" : t > elapsed ? " (future)" : ""}</span>
        </div>
      </div>

      {tab === "intel" && (
        <>
          <SectionTitle>Flood conditions</SectionTitle>
          <Panel className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {st.flood.simulated ? <SimBadge label="Simulated input" /> : <VerifiedBadge v />}
              <span className="text-muted-foreground">{st.flood.source} · {timeAgo(st.flood.observedAt)}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${freshH < 3 ? "bg-success/15 text-success" : freshH < 8 ? "bg-warning/20" : "bg-destructive/15 text-destructive"}`}>{freshH < 3 ? "Fresh" : freshH < 8 ? "Ageing" : "Stale"}</span>
            </div>
            <Num label="Flow direction (° toward)" v={st.flood.flowBearing} min={0} max={359} step={5} on={(x) => st.setFlood({ flowBearing: x })} disabled={!canManage} />
            <Num label="Velocity min (m/s)" v={st.flood.velocityMin} min={0.1} max={4} step={0.1} on={(x) => st.setFlood({ velocityMin: Math.min(x, st.flood.velocityMax) })} disabled={!canManage} />
            <Num label="Velocity max (m/s)" v={st.flood.velocityMax} min={0.2} max={5} step={0.1} on={(x) => st.setFlood({ velocityMax: Math.max(x, st.flood.velocityMin) })} disabled={!canManage} />
            <Num label="Estimated depth (m)" v={st.flood.depthM} min={0.1} max={5} step={0.1} on={(x) => st.setFlood({ depthM: x })} disabled={!canManage} />
            <Num label="Flood extent (km²)" v={st.flood.extentKm2} min={1} max={200} step={1} on={(x) => st.setFlood({ extentKm2: x })} disabled={!canManage} />
            {canManage && <button onClick={() => st.setFlood({ observedAt: Date.now() })} className="text-xs font-semibold text-primary">Mark conditions re-checked now</button>}
          </Panel>
          <SectionTitle>Drift model assumptions</SectionTitle>
          <Panel className="space-y-3">
            <Num label="Drift factor min (× surface speed)" v={st.drift.driftFactorMin} min={0.05} max={1} step={0.05} on={(x) => st.setDrift({ driftFactorMin: Math.min(x, st.drift.driftFactorMax) })} disabled={!canManage} />
            <Num label="Drift factor max" v={st.drift.driftFactorMax} min={0.1} max={1} step={0.05} on={(x) => st.setDrift({ driftFactorMax: Math.max(x, st.drift.driftFactorMin) })} disabled={!canManage} />
            <Num label="Lateral spread (°)" v={st.drift.spreadDeg} min={5} max={60} step={1} on={(x) => st.setDrift({ spreadDeg: x })} disabled={!canManage} />
            <div className="rounded-xl bg-muted p-3 text-xs">
              Downstream range now: <b>{range[0].toFixed(1)}–{range[1].toFixed(1)} km</b><br />
              distance = velocity × drift factor × elapsed time, capped at {st.drift.maxKm} km. Uncertainty widens by 0.3°/h.
            </div>
          </Panel>
        </>
      )}

      {tab === "plan" && (
        <>
          <SectionTitle>Ranked search zones</SectionTitle>
          <p className="-mt-1 mb-2 text-xs text-muted-foreground">Priority score (0–100) ranks where to search next. It is not the chance of finding the person.</p>
          <div className="space-y-2">
            {ranked.map((r, i) => (
              <Panel key={r.sector.id} className={`p-3 ${focus === r.sector.id ? "ring-2 ring-primary" : ""}`}>
                <button className="w-full text-left" onClick={() => setFocus(r.sector.id)}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-primary-foreground" style={{ background: SECTOR_COLORS[i] }}>{i + 1}</span>
                    <b className="flex-1 text-sm">{r.sector.label}</b>
                    <span className="text-xl font-extrabold">{r.score}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.sector.distKm[0].toFixed(1)}–{r.sector.distKm[1].toFixed(1)} km from last-known point · {Math.round(r.coverage * 100)}% searched</div>
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
                </button>
                {focus === r.sector.id && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {r.factors.map((f) => (
                      <div key={f.key}>
                        <div className="flex justify-between text-[11px]"><span>{f.label} · {f.note}</span><b>{Math.round(f.value * 100)}%</b></div>
                        <Meter value={f.value} tone={f.key === "searchPenalty" ? "warning" : "primary"} />
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">Assumption: {r.sector.assumptions}</p>
                  </div>
                )}
              </Panel>
            ))}
          </div>
          <SectionTitle action={canManage && <button onClick={() => st.setWeights(DEFAULT_WEIGHTS)} className="text-xs font-semibold text-primary">Reset</button>}>Scoring weights</SectionTitle>
          <Panel className="space-y-3">
            {(Object.keys(st.weights) as (keyof PriorityWeights)[]).map((k) => (
              <Num key={k} label={{ plausibility: "Model plausibility", evidence: "Evidence quality & recency", urgency: "Urgency", accessibility: "Accessibility", searchPenalty: "Penalty for prior searches", resources: "Team availability" }[k]} v={st.weights[k]} min={0} max={k === "searchPenalty" ? 1 : 5} step={0.1} on={(x) => st.setWeights({ [k]: x })} disabled={!canManage} />
            ))}
            <p className="text-[11px] text-muted-foreground">Each witness report is counted once (in the sector containing it), weighted by reliability, verification and a 12-hour recency decay.</p>
          </Panel>
        </>
      )}

      {tab === "evidence" && <Evidence caseId={c.id} pick={pick} clearPick={() => setPick(null)} />}

      {tab === "teams" && <TeamsTab caseId={c.id} ranked={ranked} canManage={canManage} />}
    </Page>
  );
}

function Num({ label, v, min, max, step, on, disabled }: { label: string; v: number; min: number; max: number; step: number; on: (x: number) => void; disabled?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span>{label}</span><b>{Number.isInteger(step) ? v : v.toFixed(2)}</b></div>
      <Slider value={[v]} min={min} max={max} step={step} onValueChange={(x) => on(x[0])} disabled={disabled} className="mt-1.5" />
    </div>
  );
}

function Evidence({ caseId, pick, clearPick }: { caseId: string; pick: [number, number] | null; clearPick: () => void }) {
  const { observations, addObservation } = useApp();
  const [note, setNote] = useState("");
  const [rel, setRel] = useState(0.5);
  const [ago, setAgo] = useState(0);
  const list = observations.filter((o) => o.caseId === caseId);
  const add = () => {
    if (!pick) return void toast.error("Tap the map to set where it was seen");
    if (note.trim().length < 5) return void toast.error("Describe what was seen");
    addObservation({ caseId, lat: pick[0], lng: pick[1], note: note.trim(), at: Date.now() - ago * 3.6e6, verified: false, reliability: rel });
    setNote("");
    clearPick();
    toast.success("Witness report added — rankings recalculated");
  };
  return (
    <>
      <SectionTitle>Add witness report</SectionTitle>
      <Panel className="space-y-2">
        <p className="text-xs text-muted-foreground">{pick ? `Location set: ${pick[0].toFixed(4)}, ${pick[1].toFixed(4)}` : "Tap the map above to set the location."}</p>
        <input className={field} placeholder="What was seen?" value={note} onChange={(e) => setNote(e.target.value)} />
        <Num label="Source reliability" v={rel} min={0.1} max={1} step={0.1} on={setRel} />
        <Num label="Seen how many hours ago" v={ago} min={0} max={24} step={0.5} on={setAgo} />
        <button onClick={add} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Add report</button>
      </Panel>
      <SectionTitle>Reports ({list.length})</SectionTitle>
      <div className="space-y-2">
        {list.map((o) => (
          <Panel key={o.id} className="p-3 text-sm">
            <div className="flex items-center gap-2"><VerifiedBadge v={o.verified} /><span className="text-xs text-muted-foreground">reliability {Math.round(o.reliability * 100)}% · {timeAgo(o.at)}</span></div>
            <p className="mt-1">{o.note}</p>
          </Panel>
        ))}
      </div>
    </>
  );
}

function TeamsTab({ caseId, ranked, canManage }: { caseId: string; ranked: ReturnType<typeof rankSectors>; canManage: boolean }) {
  const { teams, searches, tasks, addSearch, toggleTeam } = useApp();
  const top = ranked[0];
  const recs = top ? recommendTeams(top.sector, teams).slice(0, 3) : [];
  const [sector, setSector] = useState(ranked[0]?.sector.id ?? "");
  const [outcome, setOutcome] = useState<Outcome>("not_found");
  const [cov, setCov] = useState(0.6);
  const [note, setNote] = useState("");
  const caseTasks = tasks.filter((t) => t.caseId === caseId);
  const label = (id: string) => ranked.find((r) => r.sector.id === id)?.sector.label ?? id;

  return (
    <>
      {top && (
        <>
          <SectionTitle>Recommended for {top.sector.label}</SectionTitle>
          <p className="-mt-1 mb-2 text-xs text-muted-foreground">Suggested teams only — these recommendations do not assign or notify a team.</p>
          <div className="space-y-2">
            {recs.map(({ team, score, why }) => (
              <Panel key={team.id} className="flex items-center gap-3 p-3">
                <div className="flex-1 text-sm"><b>{team.name}</b> <span className="text-xs text-muted-foreground">fit {score}</span><div className="text-xs text-muted-foreground">{why.join(" · ")}</div></div>
              </Panel>
            ))}
            {!recs.length && <Panel className="text-sm text-muted-foreground">No teams available right now.</Panel>}
          </div>
        </>
      )}

      <SectionTitle>Search tasks</SectionTitle>
      <div className="space-y-2">
        {caseTasks.map((t) => (
          <Panel key={t.id} className="p-3 text-sm"><div className="flex justify-between"><b>{t.title}</b><span className="text-xs capitalize">{t.status.replace("_", " ")}</span></div><div className="text-xs text-muted-foreground">{t.assignee}</div><div className="mt-2"><Meter value={t.progress} tone="success" /></div></Panel>
        ))}
        {!caseTasks.length && <Panel className="text-sm text-muted-foreground">No search tasks yet.</Panel>}
      </div>

      {canManage && (
        <>
          <SectionTitle>Record search outcome</SectionTitle>
          <Panel className="space-y-2">
            <select className={field} value={sector} onChange={(e) => setSector(e.target.value)}>{ranked.map((r) => <option key={r.sector.id} value={r.sector.id}>{r.sector.label}</option>)}</select>
            <select className={field} value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>{OUTCOMES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
            <Num label="Area covered" v={cov} min={0.1} max={1} step={0.05} on={setCov} />
            <input className={field} placeholder="Notes" value={note} onChange={(e) => setNote(e.target.value)} />
            <button onClick={() => {
              const team = teams.find((t) => t.assignment === sector);
              addSearch({ caseId, sectorId: sector, teamId: team?.id, outcome, coverage: cov, at: Date.now(), note });
              setNote("");
              toast.success("Outcome saved — priorities recalculated");
            }} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Save outcome</button>
          </Panel>
        </>
      )}

      <SectionTitle>Search history</SectionTitle>
      <div className="space-y-2">
        {searches.filter((s) => s.caseId === caseId).map((s) => (
          <Panel key={s.id} className="p-3 text-sm"><b>{label(s.sectorId)}</b> · {OUTCOMES.find((o) => o.v === s.outcome)?.l} · {Math.round(s.coverage * 100)}%<div className="text-xs text-muted-foreground">{s.note} · {timeAgo(s.at)}</div></Panel>
        ))}
      </div>

      <SectionTitle>Team availability</SectionTitle>
      <div className="space-y-2">
        {teams.map((t) => (
          <Panel key={t.id} className="flex items-center gap-3 p-3 text-sm">
            <div className="flex-1"><b>{t.name}</b><div className="text-xs text-muted-foreground">{t.skills.join(", ")} · {t.equipment.join(", ")}</div></div>
            <button disabled={!canManage} onClick={() => toggleTeam(t.id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${t.available ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{t.available ? "Available" : t.assignment ? `Busy · ${t.assignment}` : "Unavailable"}</button>
          </Panel>
        ))}
      </div>
    </>
  );
}
