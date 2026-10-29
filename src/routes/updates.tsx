import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Megaphone, ShieldAlert, CloudRain } from "lucide-react";
import { useApp } from "@/lib/store";
import { Chips, Page, Panel, SimBadge, timeAgo, VerifiedBadge } from "@/components/kit";
import { seo } from "@/lib/seo";
import type { Update } from "@/lib/types";

export const Route = createFileRoute("/updates")({
  head: () => seo("Verified Updates", "Public safety notices, flood alerts and evacuation instructions."),
  component: Upd,
});
const ICON = { notice: Megaphone, alert: CloudRain, evacuation: ShieldAlert };

function Upd() {
  const { updates } = useApp();
  const [k, setK] = useState<Update["kind"][]>(["notice", "alert", "evacuation"]);
  return (
    <Page>
      <p className="mb-3 text-xs text-muted-foreground">No live weather or government feed is connected. Items marked “Simulated” are demo content.</p>
      <Chips multi value={k} onChange={setK} options={[{ v: "evacuation", l: "Evacuation" }, { v: "alert", l: "Alerts" }, { v: "notice", l: "Notices" }]} />
      <div className="mt-3 space-y-2">
        {updates.filter((u) => k.includes(u.kind)).map((u) => {
          const I = ICON[u.kind];
          return (
            <Panel key={u.id} className="flex gap-3 p-3">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${u.kind === "evacuation" ? "bg-emergency/15 text-emergency" : "bg-secondary text-primary"}`}><I className="h-5 w-5" /></div>
              <div>
                <b className="text-sm">{u.title}</b>
                <p className="text-sm">{u.body}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">{u.verified ? <VerifiedBadge v /> : <SimBadge />}{u.source} · {timeAgo(u.at)}</div>
              </div>
            </Panel>
          );
        })}
      </div>
    </Page>
  );
}
