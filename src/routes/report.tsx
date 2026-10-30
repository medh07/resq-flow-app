import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Utensils, Stethoscope, Home, Droplets, LifeBuoy, Zap, HelpCircle, UserSearch, AlertTriangle } from "lucide-react";
import { RequireCitizen, useCitizenAuth } from "@/components/resq/Auth";
import { resqClient } from "@/lib/resq/client";
import { backendCategory, photoExtension, submissionKey, uploadPhoto } from "@/lib/resq/reports";
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
  component: () => <RequireCitizen><ReportPage /></RequireCitizen>,
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

export function ReportPage() {
  const { session } = useCitizenAuth();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [photoPending, setPhotoPending] = useState(false);
  const [failure, setFailure] = useState('');
  const [photo, setPhoto] = useState<File>();
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

  const submit = async () => {
    if (lock.current || !session) return;
    const e: Partial<Record<string, string>> = {};
    if (!cat) e.cat = "Choose a category";
    if (desc.trim().length < 10) e.desc = "Describe the situation (at least 10 characters)";
    if (!pt) e.pt = "Tap the map or use your location";
    if (!place.trim()) e.place = "Add a landmark or area name";
    if (!anon && phone && !/^[0-9+\s-]{7,15}$/.test(phone)) e.phone = "Enter a valid phone number";
    if (!Number.isInteger(people) || people < 1 || people > 10000) e.people = "Enter a realistic number";
    if (cat === "missing") {
      if (mp.age && Number(mp.age) > 130) e.mpname = "Age must be between 0 and 130";
      if (!mp.name.trim()) e.mpname = "Name or description required";
      if (!mp.seen) e.seen = "When were they last seen?";
      else if (new Date(mp.seen).getTime() > Date.now()) e.seen = "Time can't be in the future";
    }
    setErr(e);
    if (Object.keys(e).length || !cat || !pt) return void toast.error("Please fix the highlighted fields");
    lock.current = true; setBusy(true); setFailure('');
    try {
      if (!navigator.onLine) throw new Error('You are offline. This report has not been sent. Reconnect and retry; keep this page open.');
      const payload = {
        p_details: desc.trim(), p_categories: [backendCategory(cat)], p_severity: life ? 'critical' : sev,
        p_people: people, p_life_threatening: life, p_latitude: pt[0], p_longitude: pt[1],
        p_landmark: place.trim(), p_anonymous: anon, p_name: anon ? null : name.trim() || null,
        p_phone: anon ? null : phone.trim() || null,
        p_missing: cat === 'missing' ? { description: mp.name.trim(), age: mp.age ? Number(mp.age) : null,
          identifying_features: mp.clothing, last_seen_at: new Date(mp.seen).toISOString(),
          latitude: pt[0], longitude: pt[1], landmark: place.trim() } : null,
      };
      const retry = await submissionKey(session.user.id, payload);
      const { data, error } = await resqClient().rpc('resq_flow_submit_request', { ...payload, p_submission_id: retry.id });
      if (error) throw error;
      setReceipt(data);
      sessionStorage.removeItem(retry.key);
      if (photo) {
        setPhotoPending(true);
        try { await uploadPhoto(data, photo); setPhotoPending(false); }
        catch { setFailure('Your SOS is saved, but the photo upload failed. Retry the photo below; do not submit another SOS.'); }
      }
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Submission could not be confirmed. Retry the unchanged form to avoid duplicates.');
    } finally { lock.current = false; setBusy(false); }

  };

  if (receipt) return <Page><Panel className="space-y-3">
    <h2 className="text-xl font-bold">SOS saved to ResQ-Flow</h2>
    <p>Awaiting review by the project command centre. This does not confirm that rescue help has been dispatched.</p>
    <p className="break-all text-xs">Request ID: {receipt}</p>
    {busy && <p role="status">Uploading photo…</p>}
    {failure && <p role="alert">{failure}</p>}
    {photoPending && !busy && <Button onClick={async () => {
      if (!photo || lock.current) return;
      lock.current = true; setBusy(true);
      try { await uploadPhoto(receipt, photo); setPhotoPending(false); setFailure(''); }
      catch { setFailure('SOS remains saved. Photo upload failed; retry when connected.'); }
      finally { lock.current = false; setBusy(false); }
    }}>Retry photo upload</Button>}
    {!busy && <Link to="/track" search={{ id: receipt }} className="block font-bold text-primary underline">View my report</Link>}
  </Panel></Page>;

  return (
    <Page>
      <fieldset disabled={busy} className="min-w-0">
      <p className="mb-3 text-sm text-emergency">In immediate danger? <a href="tel:112" className="font-bold underline">Call 112</a>. Reports reach the project command centre. Official emergency-service dispatch is not connected.</p>
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
          <p className="text-xs text-muted-foreground">Stored privately with your report for authorised review.</p>
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
        <input aria-label="People affected" type="number" min={1} max={10000} step={1} className={field} value={people} onChange={(e) => setPeople(Number(e.target.value))} />
        {err.people && <p className="text-xs text-destructive">{err.people}</p>}
      </div>

      <SectionTitle action={<Button variant="link" type="button" onClick={locate} className="h-auto px-0 text-xs font-semibold text-primary">Use my location</Button>}>{cat === "missing" ? "Last-seen location" : "Current or last-known location"}</SectionTitle>
      <MapView center={pt ?? CENTER} zoom={13} onPick={(a, b) => setPt([a, b])} markers={pt ? [{ id: "pt", lat: pt[0], lng: pt[1], color: "var(--emergency)" }] : []} className="h-56" />
      {err.pt && <p className="mt-1 text-xs text-destructive">{err.pt}</p>}
      {pt && <p role="status" className="mt-1 text-xs text-muted-foreground">Selected location: {pt[0].toFixed(5)}, {pt[1].toFixed(5)}</p>}
      <input className={cn(field, "mt-2")} placeholder="Landmark / area name" value={place} onChange={(e) => setPlace(e.target.value)} />
      {err.place && <p className="text-xs text-destructive">{err.place}</p>}

      <SectionTitle>Photo evidence (optional)</SectionTitle>
      <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => {
        const f = e.target.files?.[0];
        setPhoto(undefined); setImg(undefined);
        if (!f) return;
        try { photoExtension(f); } catch (error) { e.target.value = ''; return void toast.error((error as Error).message); }
        setPhoto(f);
        const r = new FileReader();
        r.onload = () => setImg(String(r.result));
        r.readAsDataURL(f);
      }} />
      {img && <img src={img} alt="Evidence preview" className="mt-2 h-32 rounded-xl object-cover" />}

      <SectionTitle>Contact</SectionTitle>
      <p className="mb-2 text-xs text-muted-foreground">Anonymous reporting omits contact fields. Your signed-in account remains linked to the report.</p>
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

      <Button onClick={submit} className="mt-5 h-auto w-full whitespace-normal rounded-2xl bg-emergency-gradient py-4 text-base font-bold text-emergency-foreground shadow-card">{busy ? 'Sending…' : 'Send SOS / Submit emergency report'}</Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">Wait for the server receipt before assuming your report was received.</p>
      {failure && <p role="alert" className="mt-3 text-destructive">{failure}</p>}
      </fieldset>
    </Page>
  );
}
