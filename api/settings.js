// api/settings.js
// Phase 1: settings stored in Vercel KV.
// Phase 2: move to Supabase table `site_settings`.

import { createClient } from '@vercel/kv';

const SETTINGS_KEY = 'iyvix:settings';

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

function getKV() {
  return createClient({
    url:   process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
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

  const kv = getKV();

  // ── GET /api/settings (public — used by storefront) ──────────────────────
  if (req.method === 'GET') {
    try {
      const saved    = (await kv.get(SETTINGS_KEY)) || {};
      const settings = { ...DEFAULTS, ...saved };
      return res.status(200).json({ settings });
    } catch {
      return res.status(200).json({ settings: DEFAULTS });
    }
  }

  // ── PUT /api/settings (admin only) ───────────────────────────────────────
  if (req.method === 'PUT') {
    if (!isAuthorised(req)) return res.status(401).json({ error: 'Unauthorised' });
    const current  = (await kv.get(SETTINGS_KEY)) || {};
    const updated  = { ...DEFAULTS, ...current, ...req.body };
    await kv.set(SETTINGS_KEY, updated);
    return res.status(200).json({ settings: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
