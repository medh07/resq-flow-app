import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { Meter, Page, Panel, SectionTitle, timeAgo } from "@/components/kit";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { canManageResources } from "@/lib/roles";

export const Route = createFileRoute("/resources")({
  head: () => seo("Resources & Dispatch", "Relief inventory, low-stock alerts and dispatch tracking."),
  component: Res,
});
const field = "w-full rounded-xl border bg-card px-3 py-2 text-sm";
const STEPS = ["packed", "in_transit", "delivered"] as const;

function Res() {
  const { inventory, dispatches, dispatch, advanceDispatch, restock, user } = useApp();
  const can = canManageResources(user.role);
  const [d, setD] = useState({ itemId: inventory[0]?.id ?? "", qty: 10, destination: "", vehicle: "" });
  const low = inventory.filter((i) => i.qty < i.min);

  return (
    <Page>
      {low.length > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl bg-emergency/10 p-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-emergency" />
          <div><b>{low.length} items below minimum:</b> {low.map((i) => i.name).join(", ")}</div>
        </div>
      )}
      <SectionTitle>Inventory</SectionTitle>
      <div className="space-y-2">
        {inventory.map((i) => (
          <Panel key={i.id} className="p-3">
            <div className="flex items-center justify-between text-sm"><b>{i.name}</b><span className={cn("font-bold", i.qty < i.min && "text-emergency")}>{i.qty} {i.unit}</span></div>
            <div className="mt-1.5"><Meter value={i.qty / (i.min * 2)} tone={i.qty < i.min ? "emergency" : "success"} /></div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>Min {i.min}</span>{can && <button onClick={() => { restock(i.id, i.min); toast.success(`Restocked +${i.min} ${i.unit}`); }} className="font-semibold text-primary">Restock +{i.min}</button>}</div>
          </Panel>
        ))}
      </div>
      {can && (
        <>
          <SectionTitle>New dispatch</SectionTitle>
          <Panel className="space-y-2">
            <select className={field} value={d.itemId} onChange={(e) => setD({ ...d, itemId: e.target.value })}>{inventory.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.qty} {i.unit})</option>)}</select>
            <input type="number" min={1} className={field} value={d.qty} onChange={(e) => setD({ ...d, qty: Number(e.target.value) })} />
            <input className={field} placeholder="Destination" value={d.destination} onChange={(e) => setD({ ...d, destination: e.target.value })} />
            <input className={field} placeholder="Vehicle / boat ID" value={d.vehicle} onChange={(e) => setD({ ...d, vehicle: e.target.value })} />
            <button onClick={() => {
              if (!d.destination.trim() || !d.vehicle.trim()) return void toast.error("Destination and vehicle required");
              const e = dispatch(d);
              if (e) return void toast.error(e);
              toast.success("Dispatch created, stock reduced");
              setD({ ...d, destination: "", vehicle: "" });
            }} className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Create dispatch</button>
          </Panel>
        </>
      )}
      <SectionTitle>Dispatches</SectionTitle>
      <div className="space-y-2">
        {dispatches.map((x) => {
          const item = inventory.find((i) => i.id === x.itemId);
          const idx = STEPS.indexOf(x.status);
          return (
            <Panel key={x.id} className="p-3 text-sm">
              <div className="flex justify-between"><b>{x.qty} {item?.unit} {item?.name}</b><span className="text-xs text-muted-foreground">{timeAgo(x.createdAt)}</span></div>
              <div className="text-xs text-muted-foreground">→ {x.destination} · {x.vehicle}</div>
              <div className="mt-2 flex gap-1">{STEPS.map((s, i) => <div key={s} className={cn("h-1.5 flex-1 rounded-full", i <= idx ? "bg-primary" : "bg-muted")} />)}</div>
              <div className="mt-1 flex justify-between text-[11px]"><span className="capitalize">{x.status.replace("_", " ")}</span>{can && x.status !== "delivered" && <button onClick={() => advanceDispatch(x.id)} className="font-semibold text-primary">Mark {x.status === "packed" ? "in transit" : "delivered"}</button>}</div>
            </Panel>
          );
        })}
      </div>
    </Page>
  );
}
