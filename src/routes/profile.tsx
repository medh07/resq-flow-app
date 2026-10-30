import { useState } from "react";
import { RequireCitizen, useCitizenAuth } from "@/components/resq/Auth";
import { resqClient } from "@/lib/resq/client";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Page, Panel, SectionTitle } from "@/components/kit";
import { seo } from "@/lib/seo";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => seo("Profile & Role", "Choose your role and manage demo data."),
  component: () => <RequireCitizen><Prof /></RequireCitizen>,
});

const ROLES: { v: Role; l: string; d: string }[] = [
  { v: "citizen", l: "Citizen", d: "Report emergencies and track your reports" },
  { v: "volunteer", l: "Volunteer", d: "Accept and complete rescue & relief tasks" },
  { v: "manager", l: "Resource / Shelter Manager", d: "Update stock, dispatches and shelter capacity" },
];

function Prof() {
  const { user, setRole, setName, resetDemo } = useApp();
  const { session } = useCitizenAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Page>
      <Panel className="mb-4 space-y-2">
        <h2 className="font-bold">Signed in to ResQ-Flow</h2>
        <p className="break-all text-sm">{session?.user.email}</p>
        <button disabled={busy} className="text-primary underline" onClick={async () => {
          setBusy(true);
          try { const { error } = await resqClient().auth.signOut({ scope: 'local' }); if (error) throw error; }
          catch { toast.error('Sign-out failed. Please retry.'); }
          finally { setBusy(false); }
        }}>{busy ? 'Signing out…' : 'Sign out'}</button>
      </Panel>
      <p className="mb-3 text-sm text-muted-foreground">Settings below apply only to the local demo. Selecting a role does not grant backend permissions.</p>
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
      <p className="mt-2 text-xs text-muted-foreground">Demo roles are switchable for evaluation. Real permissions are managed by the project administrator.</p>
      <SectionTitle>Demo data</SectionTitle>
      <Panel className="text-sm">
        Demo data is stored on this device. Resetting it does not delete your Supabase account or submitted reports.
        <button onClick={() => { resetDemo(); toast.success("Demo data reset"); }} className="mt-2 block rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">Reset demo data</button>
      </Panel>
    </Page>
  );
}
