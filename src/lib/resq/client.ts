import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public browser credentials. Database RLS is the authority for access.
// Separate client: never reuse the Lovable Cloud session or service credentials.
export const RESQ_URL = 'https://xcuwpvwpbwbtablrwcdp.supabase.co';
const RESQ_KEY = 'sb_publishable_SLwaZ8Ic4o2WC-mBZjd1pQ_HoR26CC9';
let client: SupabaseClient | undefined;
export function resqClient() {
  if (typeof window === 'undefined') throw new Error('ResQ client is browser-only');
  return client ??= createClient(RESQ_URL, RESQ_KEY, {
    auth: { storageKey: 'resq-flow-citizen-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}
