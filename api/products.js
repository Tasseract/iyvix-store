// api/products.js
// Phase 1: products are persisted to Vercel KV (simple key-value store).
// Phase 2: swap all storage calls for Supabase Postgres queries.
//
// To enable Vercel KV: Dashboard → Storage → Create KV Store → link to project.
// The KV_ env vars are injected automatically after linking.

import { createClient } from '@vercel/kv';

const PRODUCTS_KEY = 'iyvix:products';

function getKV() {
  // Will throw clearly if env vars are missing — good for dev feedback.
  return createClient({
    url:   process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
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
      const kv       = getKV();
      const products = (await kv.get(PRODUCTS_KEY)) || [];
      return res.status(200).json({ products });
    } catch (err) {
      console.error(err);
      // Graceful fallback: return empty list so the storefront still renders
      return res.status(200).json({ products: [], warning: 'KV unavailable' });
    }
  }

  // ── Write operations require auth ─────────────────────────────────────────
  if (!isAuthorised(req)) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const kv = getKV();

  // ── POST /api/products  (create) ──────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, description, price, category, imageBase64, imageType } = req.body || {};

    if (!name || !price) {
      return res.status(400).json({ error: 'name and price are required' });
    }

    const products = (await kv.get(PRODUCTS_KEY)) || [];
    const newProduct = {
      id:          crypto.randomUUID(),
      name,
      description: description || '',
      price:       parseFloat(price),
      category:    category || 'General',
      // Phase 1: image stored as base64 data-URL in KV.
      // Phase 2: upload to Supabase Storage, store the public URL here.
      image:       imageBase64 ? `data:${imageType};base64,${imageBase64}` : null,
      createdAt:   new Date().toISOString(),
      active:      true,
    };

    products.push(newProduct);
    await kv.set(PRODUCTS_KEY, products);
    return res.status(201).json({ product: newProduct });
  }

  // ── PUT /api/products  (update) ───────────────────────────────────────────
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });

    const products = (await kv.get(PRODUCTS_KEY)) || [];
    const idx      = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });

    products[idx] = { ...products[idx], ...updates, id };
    await kv.set(PRODUCTS_KEY, products);
    return res.status(200).json({ product: products[idx] });
  }

  // ── DELETE /api/products  (soft delete — sets active: false) ─────────────
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });

    const products = (await kv.get(PRODUCTS_KEY)) || [];
    const idx      = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });

    products[idx].active = false;
    await kv.set(PRODUCTS_KEY, products);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
