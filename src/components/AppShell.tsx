import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, Home, Map, Siren, ListChecks, User, Bot, Waves, LifeBuoy, Grid3x3, Users, Package, Building2, Megaphone, ClipboardList, Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useApp } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = { to: NonNullable<LinkProps["to"]>; label: string; icon: typeof Home; roles?: Role[] };
export const NAV: Item[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/map", label: "Crisis Heat Map", icon: Map },
  { to: "/report", label: "Report an Emergency / Send SOS", icon: Siren },
  { to: "/track", label: "My Reports", icon: ClipboardList },
  { to: "/operations", label: "Rescue Operations", icon: LifeBuoy, roles: ["volunteer"] },
  { to: "/search", label: "Flood Search Intelligence", icon: Waves, roles: ["volunteer"] },
  { to: "/risk", label: "Population & Risk Grid", icon: Grid3x3 },
  { to: "/volunteers", label: "NGOs & Volunteers", icon: Users },
  { to: "/resources", label: "Resources & Dispatch", icon: Package, roles: ["manager"] },
  { to: "/shelters", label: "Shelters & Medical", icon: Building2 },
  { to: "/updates", label: "Verified Updates", icon: Megaphone },
  { to: "/profile", label: "Profile & Role", icon: User },
];

const TITLES: Record<string, string> = Object.fromEntries(NAV.map((n) => [String(n.to), n.label]));

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = useApp((s) => s.user.role);
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState(false);
  const base = "/" + (path.split("/")[1] ?? "");
  const title = path === "/" ? "ResQ-Flow" : TITLES[base] ?? "ResQ-Flow";
  const items = NAV.filter((n) => !n.roles || n.roles.includes(role));
  const bottom: Item[] = [
    ...NAV.slice(0, 3),
    role === "citizen" ? { to: "/track", label: "My Reports", icon: ClipboardList } : role === "manager" ? { to: "/resources", label: "Resources & Dispatch", icon: Package } : { to: "/volunteers", label: "Tasks", icon: ListChecks },
    { to: "/profile", label: "Profile & Role", icon: User },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-feature text-primary-foreground shadow-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-3">
          <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-primary-foreground/10">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-bold tracking-tight">{title}</h1>
          <span className="w-9" />
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="bg-feature p-5 text-primary-foreground">
            <SheetTitle className="text-primary-foreground">ResQ-Flow</SheetTitle>
            <p className="text-xs opacity-80">Flood response · prototype</p>
          </SheetHeader>
          <nav className="p-2">
            {items.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", base === n.to ? "bg-secondary text-secondary-foreground" : "hover:bg-muted")}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="mx-auto max-w-3xl border-b p-3 text-xs" role="status">{['/report', '/track', '/profile'].includes(path) ? 'Connected prototype: reports use Supabase. No official emergency-service dispatch.' : 'Demo preview: this page uses simulated local data. Use Send SOS and My Reports for connected reports.'}</div>
      <main>{children}</main>

      <button aria-label="Open assistant" onClick={() => setAi(true)} className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-feature text-primary-foreground shadow-float">
        <Bot className="h-6 w-6" />
      </button>
      <Assistant open={ai} onOpenChange={setAi} />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {bottom.map((n) => {
            const active = base === n.to;
            const isReport = n.to === "/report";
            return (
              <Link key={n.label} to={n.to} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold", active ? "text-primary" : "text-muted-foreground")}>
                {isReport ? (
                  <span className="-mt-5 grid h-11 w-11 place-items-center rounded-full bg-emergency-gradient text-emergency-foreground shadow-card"><n.icon className="h-5 w-5" /></span>
                ) : (
                  <n.icon className="h-5 w-5" />
                )}
                {isReport ? "Send SOS" : n.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

const ANSWERS: { k: RegExp; a: string; to?: string }[] = [
  { k: /missing|drift|search|swept/i, a: "Open Flood Search Intelligence to see plausible search sectors for a missing person. These are simulated estimates, never an exact location.", to: "/search" },
  { k: /shelter|stay|camp/i, a: "Shelters & Medical lists capacity and free spaces. Entries older than 6 h are flagged as stale.", to: "/shelters" },
  { k: /report|sos|help|emergency/i, a: "Use Report an Emergency / Send SOS. If life is at risk, also call 112 directly — reports reach the project command centre, not official emergency services.", to: "/report" },
  { k: /stock|supply|dispatch|food|water/i, a: "Resources & Dispatch tracks stock levels and deliveries. Items below minimum are flagged.", to: "/resources" },
  { k: /risk|depth|population/i, a: "The Population & Risk Grid shows each area's risk score and the factors behind it.", to: "/risk" },
];

function Assistant({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const [msgs, setMsgs] = useState<{ me: boolean; t: string; to?: string | undefined }[]>([
    { me: false, t: "Hi! I'm a rule-based helper (no AI model connected yet). Ask about reporting, shelters, missing persons, supplies or risk." },
  ]);
  const [q, setQ] = useState("");
  const send = () => {
    if (!q.trim()) return;
    const hit = ANSWERS.find((x) => x.k.test(q));
    setMsgs((m) => [...m, { me: true, t: q }, hit ? { me: false, t: hit.a, to: hit.to } : { me: false, t: "I couldn't match that. Try: shelter, missing person, report, supplies, risk." }]);
    setQ("");
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[75vh] max-w-3xl rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>ResQ Assistant</SheetTitle>
        </SheetHeader>
        <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto px-4">
          {msgs.map((m, i) => (
            <div key={i} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.me ? "self-end bg-primary text-primary-foreground" : "self-start bg-muted")}>
              {m.t}
              {m.to && (
                <Link to={m.to} onClick={() => onOpenChange(false)} className="mt-1 block font-semibold text-primary underline">
                  Open →
                </Link>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask something…" className="flex-1 rounded-full border bg-background px-4 py-2 text-sm" />
          <button onClick={send} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><Send className="h-4 w-4" /></button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
