// api/settings.js
// Settings stored in Supabase table `site_settings`.
// Environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const DEFAULTS = {
  storeName:    'IYVIX',
  tagline:      'Objects of consequence.',
  logoUrl:      '/assets/iyvix_logo.png',
  accentColor:  '#c9a84c',
  contactEmail: '',
  socialX:      '',
  socialIG:     '',
  maintenanceMode: false,
};

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function isAuthorised(req) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload.v === 1 && (Date.now() - payload.iat) < 8 * 60 * 60 * 1000;
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  // ── GET /api/settings (public — used by storefront) ──────────────────────
  if (req.method === 'GET') {
    try {
      const { data: rows, error } = await supabase
        .from('site_settings')
        .select('key, value');

      if (error) throw error;

      // Merge database settings with defaults
      const settings = { ...DEFAULTS };
      rows?.forEach(row => {
        settings[row.key] = row.value;
      });

      return res.status(200).json({ settings });
    } catch (err) {
      console.error(err);
      return res.status(200).json({ settings: DEFAULTS });
    }
  }

  // ── PUT /api/settings (admin only) ───────────────────────────────────────
  if (req.method === 'PUT') {
    if (!isAuthorised(req)) return res.status(401).json({ error: 'Unauthorised' });

    try {
      const updates = req.body || {};

      // Upsert each setting
      for (const [key, value] of Object.entries(updates)) {
        const { error } = await supabase
          .from('site_settings')
          .upsert({ key, value }, { onConflict: 'key' });

        if (error) throw error;
      }

      return res.status(200).json({ settings: updates });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
