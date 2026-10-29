import { createFileRoute, Link } from "@tanstack/react-router";
import { Siren, Map, Phone, Ambulance, Flame, Waves, ShieldAlert, ChevronRight, Users, HeartHandshake, Home as HomeIcon } from "lucide-react";
import { useApp } from "@/lib/store";
import { Page, Panel, SectionTitle, SevBadge, SimBadge, Stat, timeAgo } from "@/components/kit";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("Emergency Help", "Report a flood emergency, track your request and view the crisis map."),
  component: Home,
});

const ROLE_LABEL = { citizen: "Citizen", volunteer: "Volunteer", manager: "Resource & Shelter Manager" };

function Home() {
  const { user, reports, tasks, cases, shelters, updates } = useApp();
  const active = reports.filter((r) => r.status !== "handover" && r.status !== "rescued").sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1)).slice(0, 3);
  const myTasks = tasks.filter((t) => t.status !== "completed").slice(0, 3);
  const helped = reports.filter((r) => r.status === "rescued" || r.status === "handover").reduce((n, r) => n + r.people, 0);
  const sheltered = shelters.filter((s) => s.kind === "shelter").reduce((n, s) => n + s.occupancy, 0);
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const evac = updates.find((u) => u.kind === "evacuation" && u.verified);

  return (
    <Page>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">{greet},</p>
        <h2 className="text-2xl font-extrabold">{user.name}</h2>
        <span className="mt-1 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{ROLE_LABEL[user.role]}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/report" className="rounded-2xl bg-emergency-gradient p-4 text-emergency-foreground shadow-card">
          <Siren className="h-7 w-7" />
          <div className="mt-3 text-lg font-bold leading-tight">Report an Emergency / Send SOS</div>
          <div className="text-xs opacity-85">Rescue, medical help, missing person, urgent needs</div>
        </Link>
        <Link to="/map" className="rounded-2xl bg-feature p-4 text-primary-foreground shadow-card">
          <Map className="h-7 w-7" />
          <div className="mt-6 text-lg font-bold leading-tight">Crisis Heat Map</div>
          <div className="text-xs opacity-85">{reports.length} reports nearby</div>
        </Link>
      </div>

      {evac && (
        <Link to="/updates" className="mt-4 flex items-start gap-3 rounded-2xl border border-emergency/30 bg-emergency/10 p-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-emergency" />
          <div className="text-sm"><b>{evac.title}</b><div className="text-xs text-muted-foreground">{evac.source} · {timeAgo(evac.at)}</div></div>
        </Link>
      )}

      <SectionTitle>Emergency services</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {[
          { n: "112", l: "Emergency", i: Phone },
          { n: "108", l: "Ambulance", i: Ambulance },
          { n: "101", l: "Fire", i: Flame },
          { n: "1070", l: "Disaster", i: Waves },
        ].map((s) => (
          <a key={s.n} href={`tel:${s.n}`} className="flex flex-col items-center rounded-2xl bg-card p-3 shadow-card">
            <s.i className="h-5 w-5 text-primary" />
            <span className="mt-1 text-sm font-bold">{s.n}</span>
            <span className="text-[10px] text-muted-foreground">{s.l}</span>
          </a>
        ))}
      </div>

      {user.role !== "citizen" && cases.some((c) => c.status === "active") && (
        <Link to="/search" className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary"><Waves className="h-5 w-5 text-primary" /></div>
          <div className="flex-1">
            <div className="font-bold">{cases.filter((c) => c.status === "active").length} active missing-person searches</div>
            <div className="text-xs text-muted-foreground">Ranked search zones need review</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}

      <SectionTitle action={<Link to="/operations" className="text-xs font-semibold text-primary">See all</Link>}>Active reports</SectionTitle>
      <div className="space-y-2">
        {active.map((r) => (
          <Link key={r.id} to="/operations/$id" params={{ id: r.id }} className="block">
            <Panel className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2"><SevBadge s={r.severity} /><span className="text-xs text-muted-foreground">{r.place}</span></div>
                <div className="mt-1 line-clamp-1 text-sm font-medium">{r.description}</div>
              </div>
              <span className="text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
            </Panel>
          </Link>
        ))}
      </div>

      {user.role !== "citizen" && (
        <>
          <SectionTitle action={<Link to="/volunteers" className="text-xs font-semibold text-primary">Tasks</Link>}>Your next tasks</SectionTitle>
          <div className="space-y-2">
            {myTasks.map((t) => (
              <Panel key={t.id} className="flex items-center justify-between p-3 text-sm">
                <span className="font-medium">{t.title}</span>
                <span className="text-xs capitalize text-muted-foreground">{t.status.replace("_", " ")}</span>
              </Panel>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Community impact <SimBadge label="Demo data" /></SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="People helped" value={helped} sub={<Users className="inline h-3 w-3" />} />
        <Stat label="Sheltered" value={sheltered} sub={<HomeIcon className="inline h-3 w-3" />} />
        <Stat label="Tasks done" value={tasks.filter((t) => t.status === "completed").length} sub={<HeartHandshake className="inline h-3 w-3" />} />
      </div>

      <SectionTitle>Stay safe</SectionTitle>
      <Panel className="space-y-2 text-sm">
        <p>• Never walk or drive through flood water — 15 cm can knock you down.</p>
        <p>• Switch off electricity at the mains if water enters your home.</p>
        <p>• Keep documents, medicines and a charged phone in a waterproof bag.</p>
      </Panel>
    </Page>
  );
}
