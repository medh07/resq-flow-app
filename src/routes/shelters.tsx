import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Navigation } from "lucide-react";
import { useApp } from "@/lib/store";
import { Chips, Meter, Page, Panel, timeAgo } from "@/components/kit";
import { MapView } from "@/components/MapView";
import { CENTER } from "@/lib/seed";
import { seo } from "@/lib/seo";
import { canManageResources } from "@/lib/roles";

export const Route = createFileRoute("/shelters")({
  head: () => seo("Shelters & Medical Aid", "Shelter occupancy, free spaces, facilities and medical camps."),
  component: Shel,
});

function Shel() {
  const { shelters, user, updateShelter, addTask } = useApp();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<("shelter" | "medical")[]>(["shelter", "medical"]);
  const [onlyFree, setOnlyFree] = useState<string[]>([]);
  const list = shelters.filter((s) => kind.includes(s.kind) && (!q || `${s.name} ${s.facilities.join(" ")} ${s.services?.join(" ") ?? ""}`.toLowerCase().includes(q.toLowerCase())) && (!onlyFree.length || s.occupancy < s.capacity));
  const can = canManageResources(user.role);

  return (
    <Page>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shelters, facilities, services…" className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Chips multi value={kind} onChange={setKind} options={[{ v: "shelter", l: "Shelters" }, { v: "medical", l: "Medical camps" }]} />
        <Chips multi value={onlyFree} onChange={setOnlyFree} options={[{ v: "free", l: "Has space" }]} />
      </div>
      <MapView center={CENTER} zoom={12} className="mt-3 h-52" markers={list.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, color: s.kind === "medical" ? "var(--success)" : "var(--primary)", label: `${s.name}: ${s.capacity - s.occupancy} free` }))} />
      <div className="mt-3 space-y-2">
        {list.map((s) => {
          const stale = Date.now() - s.updatedAt > 6 * 3.6e6;
          const pct = s.occupancy / s.capacity;
          return (
            <Panel key={s.id} className="p-3">
              <div className="flex items-center justify-between"><b className="text-sm">{s.name}</b><span className="text-xs font-semibold text-primary">{s.kind === "medical" ? "Medical" : "Shelter"}</span></div>
              <div className="mt-1 flex justify-between text-xs"><span>{s.occupancy}/{s.capacity} occupied</span><b className={pct >= 1 ? "text-emergency" : "text-success"}>{Math.max(0, s.capacity - s.occupancy)} free</b></div>
              <div className="mt-1"><Meter value={pct} tone={pct >= 1 ? "emergency" : pct > 0.85 ? "warning" : "success"} /></div>
              <div className="mt-1 text-[11px] text-muted-foreground">{[...s.facilities, ...(s.services ?? [])].join(" · ")}{s.accessible ? " · wheelchair accessible" : ""}{s.medicalUrgent ? ` · ${s.medicalUrgent} urgent patients` : ""}</div>
              {stale && <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-warning"><AlertTriangle className="h-3 w-3" /> Updated {timeAgo(s.updatedAt)} — availability may be outdated</div>}
              {!stale && <div className="mt-1 text-[11px] text-muted-foreground">Updated {timeAgo(s.updatedAt)}</div>}
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"><Navigation className="h-3 w-3" /> Route</a>
                {can && (
                  <>
                    <button onClick={() => updateShelter(s.id, Math.max(0, s.occupancy - 10))} className="rounded-xl border px-3 py-1.5 text-xs font-semibold">−10</button>
                    <button onClick={() => updateShelter(s.id, s.occupancy + 10)} className="rounded-xl border px-3 py-1.5 text-xs font-semibold">+10</button>
                    <button onClick={() => { addTask({ title: `Supplies needed at ${s.name}`, kind: "relief", location: s.name, needs: ["logistics"] }); toast.success("Supply request posted to tasks"); }} className="rounded-xl border px-3 py-1.5 text-xs font-semibold">Request supplies</button>
                  </>
                )}
              </div>
            </Panel>
          );
        })}
        {!list.length && <Panel className="text-sm text-muted-foreground">No matches.</Panel>}
      </div>
    </Page>
  );
}
