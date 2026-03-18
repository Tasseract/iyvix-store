// api/supabase.js
// Optional: Shared Supabase client factory for all API routes

import { createClient } from '@supabase/supabase-js';

let supabaseClient = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
}

export function getSupabaseAdmin() {
  // Use service role key for admin operations (like user creation)
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE service role key');
  }

  return createClient(url, key);
}
