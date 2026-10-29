import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/lib/store";
import { Page, Panel, SectionTitle, SimBadge } from "@/components/kit";
import { seo } from "@/lib/seo";
import { ChevronRight, UserSearch } from "lucide-react";

export const Route = createFileRoute("/search/")({
  head: () => seo("Flood Search Intelligence", "Missing-person search sectors, drift scenarios and adaptive search planning."),
  component: Cases,
});

function Cases() {
  const { cases, observations, searches } = useApp();
  return (
    <Page>
      <Panel className="bg-feature text-primary-foreground">
        <div className="text-lg font-bold">Decision support, not location finding</div>
        <p className="mt-1 text-sm opacity-90">Search sectors come from a transparent drift simulation plus field evidence. They never show where a person is — only where searching is most worthwhile.</p>
      </Panel>
      <SectionTitle action={<Link to="/report" className="text-xs font-semibold text-primary">+ New case</Link>}>Missing-person cases</SectionTitle>
      <div className="space-y-2">
        {cases.map((c) => {
          const h = (Date.now() - c.lastSeenAt) / 3.6e6;
          return (
            <Link key={c.id} to="/search/$caseId" params={{ caseId: c.id }} className="block">
              <Panel className="flex items-center gap-3 p-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary"><UserSearch className="h-5 w-5 text-primary" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold">{c.name} {c.simulated && <SimBadge label="Demo" />}</div>
                  <div className="text-xs text-muted-foreground">Last seen {c.lastPlace} · {h.toFixed(1)} h ago</div>
                  <div className="text-xs text-muted-foreground">{observations.filter((o) => o.caseId === c.id).length} reports · {searches.filter((s) => s.caseId === c.id).length} searches · <span className="font-semibold capitalize text-primary">{c.status}</span></div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Panel>
            </Link>
          );
        })}
        {!cases.length && <Panel className="text-sm text-muted-foreground">No cases. Report a missing person from “Report an Emergency / Send SOS”.</Panel>}
      </div>
    </Page>
  );
}
