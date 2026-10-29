import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { Page, Panel, SectionTitle, SevBadge, SimBadge, sevVar, timeAgo, VerifiedBadge } from "@/components/kit";
import { MapView } from "@/components/MapView";
import { REPORT_FLOW, STATUS_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export const Route = createFileRoute("/operations/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Incident ${params.id} · ResQ-Flow` },
      { name: "description", content: "Emergency report details, assigned team and rescue status." },
      { property: "og:title", content: `Incident ${params.id} · ResQ-Flow` },
      { property: "og:description", content: "Emergency report details, assigned team and rescue status." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Incident,
});

function Incident() {
  const { id } = Route.useParams();
  const { reports, teams, myReportIds } = useApp();
  const r = reports.find((x) => x.id === id);
  if (!r) return <Page><Panel>Incident not found. <Link to="/operations" className="text-primary">Back</Link></Panel></Page>;
  const team = teams.find((t) => t.id === r.teamId);
  const idx = REPORT_FLOW.indexOf(r.status);

  return (
    <Page>
      <Panel>
        <div className="flex flex-wrap items-center gap-2"><SevBadge s={r.severity} /><VerifiedBadge v={r.verified} />{r.simulated && <SimBadge label="Demo report" />}</div>
        <h2 className="mt-2 text-lg font-bold">{r.id} · {r.place}</h2>
        <p className="text-sm">{r.description}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-muted p-2"><b className="block text-base">{r.people}</b>people</div>
          <div className="rounded-xl bg-muted p-2"><b className="block text-base capitalize">{r.category}</b>category</div>
          <div className="rounded-xl bg-muted p-2"><b className="block text-base">{timeAgo(r.createdAt)}</b>reported</div>
        </div>
        {r.image && <img src={r.image} alt="Reported evidence" className="mt-3 h-40 w-full rounded-xl object-cover" />}
        <div className="mt-2 text-xs text-muted-foreground">Reporter: {r.anonymous ? "Anonymous" : myReportIds.includes(r.id) ? `${r.contactName ?? "—"} · ${r.contactPhone ?? "—"}` : "Contact details private"}</div>
      </Panel>

      <MapView center={[r.lat, r.lng]} zoom={14} className="mt-3 h-48" markers={[{ id: r.id, lat: r.lat, lng: r.lng, color: sevVar[r.severity] }, ...teams.map((t) => ({ id: t.id, lat: t.lat, lng: t.lng, color: t.available ? "var(--chart-2)" : "var(--sev-unknown)", size: 6, label: t.name }))]} />

      <SectionTitle>Rescue workflow</SectionTitle>
      <Panel>
        <ol className="flex justify-between">
          {REPORT_FLOW.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col items-center text-center text-[10px]">
              <span className={cn("grid h-7 w-7 place-items-center rounded-full", i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i <= idx ? <Check className="h-4 w-4" /> : i + 1}</span>
              <span className="mt-1 leading-tight">{STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <SectionTitle>Assigned team</SectionTitle>
      {team ? (
        <Panel className="text-sm"><b>{team.name}</b> · {team.members} members<div className="text-xs text-muted-foreground">{team.skills.join(", ")}</div></Panel>
      ) : (
        <Panel className="text-sm text-muted-foreground">Not yet assigned.</Panel>
      )}

      <SectionTitle>Equipment & resources</SectionTitle>
      <p className="text-sm text-muted-foreground">{r.equipment.join(", ") || "None selected"}</p>
    </Page>
  );
}
