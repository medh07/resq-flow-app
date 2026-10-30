import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Page, Panel } from '@/components/kit';
import { RequireCitizen, useCitizenAuth } from '@/components/resq/Auth';
import { resqClient } from '@/lib/resq/client';
import { seo } from '@/lib/seo';
export const Route = createFileRoute('/track')({
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({ id: typeof s.id === 'string' ? s.id : undefined }),
  head: () => seo('My Reports', 'Track reports saved to ResQ-Flow.'),
  component: () => <RequireCitizen><Track /></RequireCitizen>,
});
type Report = { id: string; tracking_code: string; details: string; status: string; verification: string; reported_severity: string; people_affected: number; landmark: string | null; created_at: string };
type Update = { id: string; message: string; created_at: string };
const label = (s: string) => s.replaceAll('_', ' ');
function Track() {
  const { session } = useCitizenAuth();
  const { id } = Route.useSearch();
  const [query, setQuery] = useState(id || '');
  const [filter, setFilter] = useState(id || '');
  const [rows, setRows] = useState<Report[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [updateError, setUpdateError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setBusy(true); setError(''); setRows([]); setSelected(null);
    void (async () => {
      try {
        let request = resqClient().from('requests').select('id,tracking_code,details,status,verification,reported_severity,people_affected,landmark,created_at').eq('reporter_id', session!.user.id);
        if (filter) request = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filter) ? request.eq('id', filter) : request.eq('tracking_code', filter.toUpperCase());
        const result = await request.order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 20, page * 20 + 20);
        if (result.error) throw result.error;
        if (!cancelled) { setRows((result.data || []).slice(0, 20)); setMore((result.data || []).length > 20); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load reports. Retry.'); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [session?.user.id, filter, page, refresh]);
  useEffect(() => {
    let cancelled = false; setUpdates([]); setUpdateError('');
    if (selected) void (async () => {
      try {
        const result = await resqClient().from('request_updates').select('id,message,created_at').eq('request_id', selected).eq('citizen_visible', true).order('created_at', { ascending: false }).limit(100);
        if (result.error) throw result.error;
        if (!cancelled) setUpdates(result.data || []);
      } catch { if (!cancelled) setUpdateError('Unable to load updates. Close and reopen this report to retry.'); }
    })();
    return () => { cancelled = true; };
  }, [selected, session?.user.id, refresh]);
  return <Page>
    <h2 className="mb-3 text-xl font-bold">My reports · Supabase</h2>
    <p className="mb-3 text-sm text-muted-foreground">Only reports submitted by your signed-in account appear here. Refresh to check for officer updates.</p>
    <form className="mb-3 flex gap-2" onSubmit={e => { e.preventDefault(); setPage(0); setFilter(query.trim()); }}>
      <input aria-label="Report ID" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tracking code or request ID" className="min-w-0 flex-1 rounded-xl border bg-card p-3" />
      <button className="rounded-xl border p-3">Search</button>
    </form>
    <div className="mb-4 flex gap-3"><button onClick={() => { setQuery(''); setFilter(''); setPage(0); }} className="text-primary underline">All my reports</button><button disabled={busy} onClick={() => setRefresh(v => v + 1)} className="text-primary underline">Refresh</button></div>
    {error && <p role="alert">{error}</p>}
    {busy ? <p role="status">Loading reports…</p> : !error && rows.length === 0 ? <Panel>No matching reports. <Link to="/report" className="text-primary underline">Send SOS</Link></Panel> : null}
    <div className="space-y-3">{rows.map(r => <Panel key={r.id}>
      <h3 className="font-bold">{r.tracking_code}</h3><p className="mt-2 whitespace-pre-wrap">{r.details}</p>
      <p className="mt-2 text-sm">Status: {label(r.status)} · Verification: {label(r.verification)}</p>
      <p className="text-sm">Reported severity: {r.reported_severity} · {r.people_affected} people</p>
      <p className="text-xs text-muted-foreground">{r.landmark} · {new Date(r.created_at).toLocaleString()}</p>
      <button className="mt-3 text-primary underline" onClick={() => setSelected(selected === r.id ? null : r.id)}>{selected === r.id ? 'Hide updates' : 'View updates'}</button>
      {selected === r.id && <div className="mt-3 space-y-2"><p className="text-xs">Latest 100 public-to-reporter updates</p>{updateError && <p role="alert">{updateError}</p>}{updates.map(u => <p key={u.id} className="border-t pt-2 text-sm">{u.message}<span className="block text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</span></p>)}</div>}
    </Panel>)}</div>
    <div className="mt-4 flex gap-4"><button disabled={busy || page === 0} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={busy || !more} onClick={() => setPage(p => p + 1)}>Next</button></div>
  </Page>;
}
