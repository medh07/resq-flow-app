import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Page, Panel, SectionTitle, SevBadge, timeAgo } from "@/components/kit";
import { REPORT_FLOW, STATUS_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";
import { Check } from "lucide-react";

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({ id: typeof s.id === "string" ? s.id : undefined }),
  head: () => seo("My Reports", "Track the status of emergency reports you submitted."),
  component: Track,
});


function Track() {
  const { id } = Route.useSearch();
  const { reports, myReportIds } = useApp();
  const [q, setQ] = useState(id ?? "");
  const found = reports.find((r) => r.id.toLowerCase() === q.trim().toLowerCase());
  const mine = reports.filter((r) => myReportIds.includes(r.id));

  return (
    <Page>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Enter report ID, e.g. R-1042" className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm" />
      {q && !found && <p className="mt-2 text-sm text-muted-foreground">No report with that ID.</p>}
      {found && (
        <Panel className="mt-3">
          <div className="flex items-center justify-between"><b>{found.id}</b><SevBadge s={found.severity} /></div>
          <p className="mt-1 text-sm">{found.description}</p>
          {myReportIds.includes(found.id) && <p role="status" className="mt-2 text-sm text-muted-foreground">Report {found.id} saved on this device. It has not been sent to authorities or rescuers. In danger? <a href="tel:112" className="font-semibold text-emergency underline">Call 112</a>.</p>}
          <p className="mt-2 text-xs text-muted-foreground">{found.place} · {found.people} people · Status: {STATUS_LABEL[found.status]}</p>
          <ol className="mt-4 space-y-3">
            {REPORT_FLOW.map((s) => {
              const h = found.history.find((x) => x.status === s);
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className={cn("grid h-6 w-6 place-items-center rounded-full text-xs", h ? "bg-success text-primary-foreground" : "bg-muted text-muted-foreground")}>{h ? <Check className="h-3.5 w-3.5" /> : ""}</span>
                  <span className={cn("flex-1 text-sm", !h && "text-muted-foreground")}>{STATUS_LABEL[s]}</span>
                  {h && <span className="text-[11px] text-muted-foreground">{timeAgo(h.at)}</span>}
                </li>
              );
            })}
          </ol>
        </Panel>
      )}
      <SectionTitle>Reports from this device</SectionTitle>
      {mine.length === 0 ? (
        <Panel className="text-sm text-muted-foreground">You haven't submitted any reports. <Link to="/report" className="font-semibold text-primary">Report an Emergency / Send SOS</Link></Panel>
      ) : (
        <div className="space-y-2">
          {mine.map((r) => (
            <button key={r.id} onClick={() => setQ(r.id)} className="w-full text-left">
              <Panel className="flex items-center justify-between p-3 text-sm"><span><b>{r.id}</b> · {r.place}</span><span className="text-xs text-muted-foreground">{STATUS_LABEL[r.status]}</span></Panel>
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}
