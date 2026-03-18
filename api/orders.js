// api/orders.js
// Phase 1: orders are stored in Vercel KV.
// Phase 2: replace with Supabase Postgres + Stripe webhook integration.

import { createClient } from '@vercel/kv';

const ORDERS_KEY = 'iyvix:orders';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthorised(req)) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const kv = getKV();

  // ── GET /api/orders ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const orders = (await kv.get(ORDERS_KEY)) || [];
    return res.status(200).json({ orders });
  }

  // ── POST /api/orders  (Phase 2: called by Stripe webhook) ─────────────────
  if (req.method === 'POST') {
    const { customerName, customerEmail, items, total, status } = req.body || {};
    const orders = (await kv.get(ORDERS_KEY)) || [];
    const order  = {
      id:            crypto.randomUUID(),
      customerName:  customerName  || 'Unknown',
      customerEmail: customerEmail || '',
      items:         items || [],
      total:         parseFloat(total) || 0,
      status:        status || 'pending',   // pending | paid | fulfilled | cancelled
      createdAt:     new Date().toISOString(),
    };
    orders.unshift(order);   // newest first
    await kv.set(ORDERS_KEY, orders);
    return res.status(201).json({ order });
  }

  // ── PUT /api/orders  (update status) ──────────────────────────────────────
  if (req.method === 'PUT') {
    const { id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: 'id and status required' });
    const orders = (await kv.get(ORDERS_KEY)) || [];
    const idx    = orders.findIndex(o => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });
    orders[idx].status = status;
    await kv.set(ORDERS_KEY, orders);
    return res.status(200).json({ order: orders[idx] });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
