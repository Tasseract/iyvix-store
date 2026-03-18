// api/products.js
// Products are persisted to Supabase Postgres.
// Environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { getSupabaseAdmin } from './supabase.js';

function getSupabase() {
  // Centralise admin client creation so errors are consistent when env vars are missing
  return getSupabaseAdmin();
}

/** Lightweight token check (Phase 1). Phase 2: verify Supabase JWT. */
function isAuthorised(req) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    // Token valid for 8 hours
    return payload.v === 1 && (Date.now() - payload.iat) < 8 * 60 * 60 * 1000;
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/products  (public — used by catalogue page) ──────────────────
  if (req.method === 'GET') {
    try {
      const supabase = getSupabase();
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ products: products || [] });
    } catch (err) {
      console.error(err);
      return res.status(200).json({ products: [] });
    }
  }

  // ── Write operations require auth ─────────────────────────────────────────
  if (!isAuthorised(req)) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const supabase = getSupabase();

  // ── POST /api/products  (create) ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, description, price, category, imageBase64, imageType, featured } = req.body || {};

    if (!name || !price) {
      return res.status(400).json({ error: 'name and price are required' });
    }

    try {
      const { data: product, error } = await supabase
        .from('products')
        .insert({
          name,
          description: description || '',
          price: parseFloat(price),
          category: category || 'General',
          image: imageBase64 ? `data:${imageType};base64,${imageBase64}` : null,
          featured: featured === true || featured === 'true',
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ product });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create product' });
    }
  }

  // ── PUT /api/products  (update) ───────────────────────────────────────────
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });

    try {
      const { data: product, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json({ product });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update product' });
    }
  }

  // ── DELETE /api/products  (soft delete — sets active: false) ─────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });

    try {
      const { error } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
