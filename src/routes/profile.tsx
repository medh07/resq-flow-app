import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Page, Panel, SectionTitle } from "@/components/kit";
import { seo } from "@/lib/seo";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => seo("Profile & Role", "Choose your role and manage demo data."),
  component: Prof,
});

const ROLES: { v: Role; l: string; d: string }[] = [
  { v: "citizen", l: "Citizen", d: "Report emergencies and track your reports" },
  { v: "volunteer", l: "Volunteer", d: "Accept and complete rescue & relief tasks" },
  { v: "manager", l: "Resource / Shelter Manager", d: "Update stock, dispatches and shelter capacity" },
];

function Prof() {
  const { user, setRole, setName, resetDemo } = useApp();
  return (
    <Page>
      <Panel>
        <label className="text-xs font-semibold">Display name</label>
        <input value={user.name} onChange={(e) => setName(e.target.value.slice(0, 40))} className="mt-1 w-full rounded-xl border bg-card px-3 py-2 text-sm" />
      </Panel>
      <SectionTitle>Role</SectionTitle>
      <div className="space-y-2">
        {ROLES.map((r) => (
          <button key={r.v} onClick={() => setRole(r.v)} className={cn("w-full rounded-2xl border-2 bg-card p-3 text-left shadow-card", user.role === r.v ? "border-primary" : "border-transparent")}>
            <b className="text-sm">{r.l}</b>
            <div className="text-xs text-muted-foreground">{r.d}</div>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Demo mode: roles are switchable for evaluation. Sign-in and server-side permissions aren't connected yet.</p>
      <SectionTitle>Demo data</SectionTitle>
      <Panel className="text-sm">
        All data is simulated and stored on this device.
        <button onClick={() => { resetDemo(); toast.success("Demo data reset"); }} className="mt-2 block rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">Reset demo data</button>
      </Panel>
    </Page>
  );
}
