import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Chips, Page, Panel, SevBadge, sevVar, timeAgo, VerifiedBadge } from "@/components/kit";
import { MapView } from "@/components/MapView";
import { CENTER } from "@/lib/seed";
import { STATUS_LABEL, type ReportStatus, type Severity } from "@/lib/types";
import { seo } from "@/lib/seo";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/operations/")({
  head: () => seo("Rescue Operations", "Search flood incidents and view assigned teams and rescue progress."),
  component: Ops,
});

function Ops() {
  const { reports, teams } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<Severity[]>([]);
  const [st, setSt] = useState<("open" | "active" | "done")[]>(["open", "active"]);
  const [view, setView] = useState<"list" | "map">("list");
  const group = (s: ReportStatus) => (s === "reported" || s === "verified" ? "open" : s === "assigned" || s === "en_route" ? "active" : "done");
  const list = reports
    .filter((r) => (!sev.length || sev.includes(r.severity)) && st.includes(group(r.status)))
    .filter((r) => !q || `${r.id} ${r.place} ${r.description} ${r.category}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => ["critical", "high", "medium", "low", "unknown"].indexOf(a.severity) - ["critical", "high", "medium", "low", "unknown"].indexOf(b.severity));

  return (
    <Page>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search incidents, places, IDs…" className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm" />
      <div className="mt-3 space-y-2">
        <Chips multi value={st} onChange={setSt} options={[{ v: "open", l: "Needs action" }, { v: "active", l: "In progress" }, { v: "done", l: "Resolved" }]} />
        <Chips multi value={sev} onChange={setSev} options={[{ v: "critical", l: "Critical" }, { v: "high", l: "High" }, { v: "medium", l: "Medium" }, { v: "low", l: "Low" }]} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{list.length} incidents · {teams.filter((t) => t.available).length} teams available</span>
        <Chips value={[view]} onChange={(v) => v[0] && setView(v[0])} options={[{ v: "list", l: "List" }, { v: "map", l: "Map" }]} />
      </div>
      {view === "map" ? (
        <MapView center={CENTER} className="mt-3 h-[60vh]" markers={list.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, color: sevVar[r.severity], label: r.id, onClick: () => nav({ to: "/operations/$id", params: { id: r.id } }) }))} />
      ) : (
        <div className="mt-3 space-y-2">
          {list.map((r) => (
            <Link key={r.id} to="/operations/$id" params={{ id: r.id }} className="block">
              <Panel className="p-3">
                <div className="flex flex-wrap items-center gap-2"><SevBadge s={r.severity} /><VerifiedBadge v={r.verified} /><span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span></div>
                <div className="mt-1 text-sm font-semibold">{r.id} · {r.place}</div>
                <div className="line-clamp-1 text-sm text-muted-foreground">{r.description}</div>
                <div className="mt-1 text-xs font-medium text-primary">{STATUS_LABEL[r.status]}{r.teamId && ` · ${teams.find((t) => t.id === r.teamId)?.name}`}</div>
              </Panel>
            </Link>
          ))}
          {!list.length && <Panel className="text-sm text-muted-foreground">No incidents match these filters.</Panel>}
        </div>
      )}
    </Page>
  );
}
