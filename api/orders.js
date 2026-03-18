// api/orders.js
// Orders are stored in Supabase Postgres.
// Environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthorised(req)) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const supabase = getSupabase();

  // ── GET /api/orders ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ orders: orders || [] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  // ── POST /api/orders  (create) ────────────────────────────────────────────
  if (req.method === 'POST') {
    const { customerName, customerEmail, items, total, status } = req.body || {};

    try {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName || 'Unknown',
          customer_email: customerEmail || '',
          items: items || [],
          total: parseFloat(total) || 0,
          status: status || 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create order' });
    }
  }

  // ── PUT /api/orders  (update status) ───────────────────────────────────────
  if (req.method === 'PUT') {
    const { id, status } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: 'id and status required' });

    try {
      const { data: order, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!order) return res.status(404).json({ error: 'Order not found' });
      return res.status(200).json({ order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update order' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
