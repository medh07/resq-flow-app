import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";
import { FlaskConical, ShieldCheck } from "lucide-react";

export function timeAgo(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export const sevClass: Record<Severity, string> = {
  critical: "bg-sev-critical/15 text-sev-critical",
  high: "bg-sev-high/15 text-sev-high",
  medium: "bg-sev-medium/25 text-foreground",
  low: "bg-sev-low/15 text-sev-low",
  unknown: "bg-sev-unknown/20 text-muted-foreground",
};
export const sevVar: Record<Severity, string> = {
  critical: "var(--sev-critical)",
  high: "var(--sev-high)",
  medium: "var(--sev-medium)",
  low: "var(--sev-low)",
  unknown: "var(--sev-unknown)",
};

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize", className)}>{children}</span>;
}
export function SevBadge({ s }: { s: Severity }) {
  return <Pill className={sevClass[s]}>{s}</Pill>;
}
export function SimBadge({ label = "Simulated" }: { label?: string }) {
  return (
    <Pill className="bg-sim text-sim-foreground normal-case">
      <FlaskConical className="h-3 w-3" /> {label}
    </Pill>
  );
}
export function VerifiedBadge({ v }: { v: boolean }) {
  return v ? (
    <Pill className="bg-success/15 text-success normal-case">
      <ShieldCheck className="h-3 w-3" /> Verified
    </Pill>
  ) : (
    <Pill className="bg-muted text-muted-foreground normal-case">Unverified</Pill>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-card p-4 shadow-card", className)}>{children}</div>;
}
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <h2 className="text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}
export function Meter({ value, tone = "primary" }: { value: number; tone?: "primary" | "emergency" | "success" | "warning" }) {
  const c = { primary: "bg-primary", emergency: "bg-emergency", success: "bg-success", warning: "bg-warning" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", c)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Panel className="p-3">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </Panel>
  );
}
export function Chips<T extends string>({ options, value, onChange, multi }: { options: { v: T; l: string }[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.v);
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(multi ? (on ? value.filter((x) => x !== o.v) : [...value, o.v]) : [o.v])}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground")}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4">{children}</div>;
}
