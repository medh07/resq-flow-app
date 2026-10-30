import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { resqClient } from '@/lib/resq/client';
const Context = createContext<{ session: Session | null; ready: boolean }>({ session: null, ready: false });
export function CitizenAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = resqClient().auth.onAuthStateChange((_event, next) => { setSession(next); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  return <Context.Provider value={{ session, ready }}>{children}</Context.Provider>;
}
export const useCitizenAuth = () => useContext(Context);
export function RequireCitizen({ children }: { children: ReactNode }) {
  const { session, ready } = useCitizenAuth();
  if (!ready) return <p className="p-6 text-center">Loading account…</p>;
  return session ? <div key={session.user.id}>{children}</div> : <Login />;
}
export function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <section className="mx-auto max-w-lg space-y-4 p-6">
    <h2 className="text-xl font-bold">{mode === 'login' ? 'Sign in to ResQ-Flow' : 'Create a citizen account'}</h2>
    <p className="text-sm">Use email and password for this prototype. Phone OTP will be added later. Reports go to the project command centre; emergency-service dispatch is not connected.</p>
    <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); if (busy) return;
      const form = new FormData(e.currentTarget);
      const credentials = { email: String(form.get('email')).trim(), password: String(form.get('password')) };
      setBusy(true); setMessage('');
      try {
        const result = mode === 'login' ? await resqClient().auth.signInWithPassword(credentials) : await resqClient().auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/profile` } });
        if (result.error) throw result.error;
        if (mode === 'signup' && !result.data.session) setMessage('Check your email to confirm your account, then return here and sign in. If no email arrives, ask the project owner to check email delivery.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to sign in. Please retry.'); }
      finally { setBusy(false); }
    }}>
      <label className="block">Email<input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-xl border bg-card p-3" /></label>
      <label className="block">Password<input name="password" type="password" required minLength={mode === 'signup' ? 8 : undefined} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="mt-1 w-full rounded-xl border bg-card p-3" /></label>
      <button disabled={busy} className="rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
    </form>
    <p role="status" className="text-sm">{message}</p>
    <button disabled={busy} className="text-primary underline" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{mode === 'login' ? 'New here? Create account' : 'Already registered? Sign in'}</button>
  </section>;
}
