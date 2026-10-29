import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Chips, Meter, Page, Panel, SectionTitle, VerifiedBadge } from "@/components/kit";
import { seo } from "@/lib/seo";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/volunteers")({
  head: () => seo("NGOs & Volunteers", "Volunteer tasks, organisation registration and coordination."),
  component: Vol,
});
const field = "w-full rounded-xl border bg-card px-3 py-2 text-sm";

function Vol() {
  const { tasks, orgs, user, acceptTask, progressTask, addOrg } = useApp();
  const [tab, setTab] = useState<"tasks" | "orgs">("tasks");
  const [f, setF] = useState<Task["status"][]>(["open", "assigned", "in_progress"]);
  const [org, setOrg] = useState({ name: "", area: "", focus: "" });
  const list = tasks.filter((t) => f.includes(t.status));

  return (
    <Page>
      <Chips value={[tab]} onChange={(v) => v[0] && setTab(v[0])} options={[{ v: "tasks", l: "Tasks" }, { v: "orgs", l: "Organisations" }]} />
      {tab === "tasks" ? (
        <>
          <div className="mt-3"><Chips multi value={f} onChange={setF} options={[{ v: "open", l: "Open" }, { v: "assigned", l: "Assigned" }, { v: "in_progress", l: "In progress" }, { v: "completed", l: "Completed" }]} /></div>
          <div className="mt-3 space-y-2">
            {list.map((t) => (
              <Panel key={t.id} className="p-3">
                <div className="flex items-center justify-between"><b className="text-sm">{t.title}</b><span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold capitalize text-secondary-foreground">{t.kind}</span></div>
                <div className="text-xs text-muted-foreground">{t.location}{t.needs.length ? ` · needs ${t.needs.join(", ")}` : ""}{t.assignee ? ` · ${t.assignee}` : ""}</div>
                <div className="mt-2"><Meter value={t.progress} tone="success" /></div>
                <div className="mt-2 flex gap-2">
                  {t.status === "open" && user.role !== "citizen" && <button onClick={() => { acceptTask(t.id); toast.success("Task accepted"); }} className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Accept task</button>}
                  {t.status === "assigned" && <button onClick={() => progressTask(t.id)} className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">Start</button>}
                  {t.status === "in_progress" && <button onClick={() => { progressTask(t.id); toast.success("Task completed"); }} className="rounded-xl bg-success px-3 py-1.5 text-xs font-semibold text-primary-foreground">Mark complete</button>}
                </div>
              </Panel>
            ))}
            {!list.length && <Panel className="text-sm text-muted-foreground">No tasks in this view.</Panel>}
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {orgs.map((o) => (
              <Panel key={o.id} className="p-3 text-sm">
                <div className="flex items-center justify-between"><b>{o.name}</b><VerifiedBadge v={o.verified} /></div>
                <div className="text-xs text-muted-foreground">{o.focus} · {o.area}</div>
              </Panel>
            ))}
          </div>
          <SectionTitle>Register an organisation</SectionTitle>
          <Panel className="space-y-2">
            <input className={field} placeholder="Organisation name" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
            <input className={field} placeholder="Operating area" value={org.area} onChange={(e) => setOrg({ ...org, area: e.target.value })} />
            <input className={field} placeholder="Focus (e.g. food, rescue)" value={org.focus} onChange={(e) => setOrg({ ...org, focus: e.target.value })} />
            <button onClick={() => { if (!org.name.trim() || !org.area.trim()) return void toast.error("Name and area required"); addOrg(org); setOrg({ name: "", area: "", focus: "" }); toast.success("Submitted — pending verification"); }} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Submit for verification</button>
          </Panel>
        </>
      )}
    </Page>
  );
}
