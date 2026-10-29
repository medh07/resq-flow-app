import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Utensils, Stethoscope, Home, Droplets, LifeBuoy, Zap, HelpCircle, UserSearch, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { MapView } from "@/components/MapView";
import { Page, Panel, SectionTitle } from "@/components/kit";
import { CENTER } from "@/lib/seed";
import type { Category, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/report")({
  head: () => seo("Report an Emergency / Send SOS", "Report your location, emergency needs or a missing person and track your request."),
  component: ReportPage,
});

const CATS: { v: Category; l: string; i: typeof Utensils }[] = [
  { v: "rescue", l: "Rescue required", i: LifeBuoy },
  { v: "medical", l: "Medical", i: Stethoscope },
  { v: "food", l: "Food", i: Utensils },
  { v: "shelter", l: "Shelter", i: Home },
  { v: "water", l: "Water & sanitation", i: Droplets },
  { v: "utilities", l: "Utilities", i: Zap },
  { v: "missing", l: "Missing person", i: UserSearch },
  { v: "other", l: "Other", i: HelpCircle },
];
const field = "w-full rounded-xl border bg-card px-3 py-2.5 text-sm";

function ReportPage() {
  const addReport = useApp((s) => s.addReport);
  const addCase = useApp((s) => s.addCase);
  const nav = useNavigate();
  const [cat, setCat] = useState<Category | null>(null);
  const [sev, setSev] = useState<Severity>("medium");
  const [life, setLife] = useState(false);
  const [people, setPeople] = useState(1);
  const [desc, setDesc] = useState("");
  const [place, setPlace] = useState("");
  const [pt, setPt] = useState<[number, number] | null>(null);
  const [anon, setAnon] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [img, setImg] = useState<string>();
  const [mp, setMp] = useState({ name: "", age: "", clothing: "", seen: "" });
  const [err, setErr] = useState<Partial<Record<string, string>>>({});

  const locate = () => {
    if (!navigator.geolocation) return void toast.error("Location unavailable — select your current or last-known location on the map");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPt([p.coords.latitude, p.coords.longitude]); toast.success("Location captured from your device"); },
      () => toast.error("Couldn't get your location — tap the map instead"),
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const submit = () => {
    const e: Partial<Record<string, string>> = {};
    if (!cat) e.cat = "Choose a category";
    if (desc.trim().length < 10) e.desc = "Describe the situation (at least 10 characters)";
    if (!pt) e.pt = "Tap the map or use your location";
    if (!place.trim()) e.place = "Add a landmark or area name";
    if (!anon && phone && !/^[0-9+\s-]{7,15}$/.test(phone)) e.phone = "Enter a valid phone number";
    if (people < 0 || people > 10000) e.people = "Enter a realistic number";
    if (cat === "missing") {
      if (!mp.name.trim()) e.mpname = "Name or description required";
      if (!mp.seen) e.seen = "When were they last seen?";
      else if (new Date(mp.seen).getTime() > Date.now()) e.seen = "Time can't be in the future";
    }
    setErr(e);
    if (Object.keys(e).length || !cat || !pt) return void toast.error("Please fix the highlighted fields");
    const id = addReport({ category: cat, severity: life ? "critical" : sev, lifeThreatening: life, people, description: desc, lat: pt[0], lng: pt[1], place, anonymous: anon, contactName: anon ? undefined : name, contactPhone: anon ? undefined : phone, image: img });
    if (cat === "missing") {
      addCase({ name: mp.name + (mp.age ? ` (age ${mp.age})` : ""), age: mp.age ? Number(mp.age) : undefined, description: mp.clothing || desc, lastLat: pt[0], lastLng: pt[1], lastPlace: place, lastSeenAt: new Date(mp.seen).getTime() });
    }
    toast.success(`Report ${id} saved on this device`, { description: "Demo mode: it is not sent to authorities. Call 112 if life is at risk." });
    nav({ to: "/track", search: { id } });
  };

  return (
    <Page>
      <p className="mb-3 text-sm text-emergency">In immediate danger? <a href="tel:112" className="font-bold underline">Call 112</a>. This demo does not send alerts to rescuers.</p>
      <SectionTitle>What's happening?</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {CATS.map((c) => (
          <Button variant="ghost" key={c.v} type="button" aria-pressed={cat === c.v} onClick={() => setCat(c.v)} className={cn("h-auto justify-start whitespace-normal flex items-center gap-2 rounded-2xl border-2 bg-card p-3 text-left text-sm font-semibold shadow-card", cat === c.v ? "border-primary" : "border-transparent")}>
            <c.i className={cn("h-5 w-5", c.v === "rescue" || c.v === "missing" ? "text-emergency" : "text-primary")} /> {c.l}
          </Button>
        ))}
      </div>
      {err.cat && <p className="mt-1 text-xs text-destructive">{err.cat}</p>}

      <Button variant="ghost" type="button" aria-pressed={life} onClick={() => setLife(!life)} className={cn("h-auto justify-start whitespace-normal mt-4 flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left", life ? "border-emergency bg-emergency/10" : "border-transparent bg-card shadow-card")}>
        <AlertTriangle className="h-6 w-6 text-emergency" />
        <div><div className="font-bold">Life-threatening emergency</div><div className="text-xs text-muted-foreground">Someone's life is at immediate risk</div></div>
      </Button>

      {!life && (
        <>
          <SectionTitle>Severity</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
              <Button variant="ghost" key={s} type="button" aria-pressed={sev === s} onClick={() => setSev(s)} className={cn("rounded-xl border-2 bg-card px-1 py-2 text-xs font-bold capitalize", sev === s ? "border-primary" : "border-transparent")}>{s}</Button>
            ))}
          </div>
        </>
      )}

      {cat === "missing" && (
        <Panel className="mt-4 space-y-2">
          <div className="text-sm font-bold">Missing person details</div>
          <p className="text-xs text-muted-foreground">Saved on this device only. Avoid posting photos of minors publicly.</p>
          <input className={field} placeholder="Name or short description" value={mp.name} onChange={(e) => setMp({ ...mp, name: e.target.value })} />
          {err.mpname && <p className="text-xs text-destructive">{err.mpname}</p>}
          <input className={field} placeholder="Age (optional)" inputMode="numeric" value={mp.age} onChange={(e) => setMp({ ...mp, age: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
          <input className={field} placeholder="Clothing / identifying features" value={mp.clothing} onChange={(e) => setMp({ ...mp, clothing: e.target.value })} />
          <label className="block text-xs font-semibold">Last seen (date & time)</label>
          <input aria-label="Last seen date and time" type="datetime-local" className={cn(field, "min-w-0 max-w-full")} value={mp.seen} onChange={(e) => setMp({ ...mp, seen: e.target.value })} />
          {err.seen && <p className="text-xs text-destructive">{err.seen}</p>}
        </Panel>
      )}

      <SectionTitle>Details</SectionTitle>
      <div className="space-y-2">
        <textarea className={cn(field, "min-h-24")} placeholder="Describe the situation…" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} />
        {err.desc && <p className="text-xs text-destructive">{err.desc}</p>}
        <label className="block text-xs font-semibold">People affected</label>
        <input aria-label="People affected" type="number" min={0} className={field} value={people} onChange={(e) => setPeople(Number(e.target.value))} />
        {err.people && <p className="text-xs text-destructive">{err.people}</p>}
      </div>

      <SectionTitle action={<Button variant="link" type="button" onClick={locate} className="h-auto px-0 text-xs font-semibold text-primary">Use my location</Button>}>{cat === "missing" ? "Last-seen location" : "Current or last-known location"}</SectionTitle>
      <MapView center={pt ?? CENTER} zoom={13} onPick={(a, b) => setPt([a, b])} markers={pt ? [{ id: "pt", lat: pt[0], lng: pt[1], color: "var(--emergency)" }] : []} className="h-56" />
      {err.pt && <p className="mt-1 text-xs text-destructive">{err.pt}</p>}
      {pt && <p role="status" className="mt-1 text-xs text-muted-foreground">Selected location: {pt[0].toFixed(5)}, {pt[1].toFixed(5)}</p>}
      <input className={cn(field, "mt-2")} placeholder="Landmark / area name" value={place} onChange={(e) => setPlace(e.target.value)} />
      {err.place && <p className="text-xs text-destructive">{err.place}</p>}

      <SectionTitle>Photo evidence (optional)</SectionTitle>
      <input type="file" accept="image/*" className="text-sm" onChange={(e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 2e6) return void toast.error("Image must be under 2 MB");
        const r = new FileReader();
        r.onload = () => setImg(String(r.result));
        r.readAsDataURL(f);
      }} />
      {img && <img src={img} alt="Evidence preview" className="mt-2 h-32 rounded-xl object-cover" />}

      <SectionTitle>Contact</SectionTitle>
      <Panel className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium">Report anonymously <Switch checked={anon} onCheckedChange={setAnon} /></label>
        {!anon && (
          <>
            <input className={field} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="tel" className={field} placeholder="Contact phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {err.phone && <p className="text-xs text-destructive">{err.phone}</p>}
          </>
        )}
      </Panel>

      <Button onClick={submit} className="mt-5 h-auto w-full whitespace-normal rounded-2xl bg-emergency-gradient py-4 text-base font-bold text-emergency-foreground shadow-card">Send SOS / Submit emergency report</Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">Demo mode: saved on this device only. In danger? Call 112.</p>
    </Page>
  );
}
