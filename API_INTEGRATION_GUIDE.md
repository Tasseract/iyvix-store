# IYVIX — API Integration Guide (Supabase + Vercel KV Hybrid)

This guide shows how to update your API endpoints to use **Supabase Postgres** while keeping **Vercel KV** as an optional cache layer.

---

## When to Use This Guide

Use this if you want:
- ✅ **Permanent storage** in Supabase Postgres
- ✅ **Fast reads** via Vercel KV cache
- ✅ **Backward compatibility** with existing API

**Do NOT use this if:**
- You prefer Vercel KV only (current setup works fine)
- You want Supabase Auth instead of hardcoded credentials

---

## Installation

```bash
npm install @supabase/supabase-js
```

Then verify environment variables in Vercel:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `KV_REST_API_URL` (keep for caching)
- `KV_REST_API_TOKEN` (keep for caching)

---

## Updated API Endpoints

### 1. api/products.js (Supabase + Cache)

```javascript
// api/products.js
// Hybrid mode: Supabase for storage + Vercel KV for cache

import { createClient } from '@vercel/kv';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const PRODUCTS_CACHE_KEY = 'iyvix:products:cache';
const CACHE_TTL = 5 * 60; // 5 minutes

function getKV() {
  return createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

function getSupabase() {
  return createSupabaseClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for write access
  );
}

function isAuthorised(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload.v === 1 && (Date.now() - payload.iat) < 8 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/products (public — try cache first) ──
  if (req.method === 'GET') {
    try {
      // Try to get from cache first
      const kv = getKV();
      const cached = await kv.get(PRODUCTS_CACHE_KEY).catch(() => null);
      if (cached) {
        return res.status(200).json({ products: cached, source: 'cache' });
      }

      // Cache miss — fetch from Supabase
      const supabase = getSupabase();
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Update cache for next request
      await kv.setex(PRODUCTS_CACHE_KEY, CACHE_TTL, products).catch(() => {});

      return res.status(200).json({ products: products || [] });
    } catch (err) {
      console.error(err);
      return res.status(200).json({ products: [], warning: 'Database unavailable' });
    }
  }

  // ── Write operations require auth ──
  if (!isAuthorised(req)) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const supabase = getSupabase();
  const kv = getKV();

  // ── POST /api/products (create) ──
  if (req.method === 'POST') {
    const { name, description, price, category, imageBase64, imageType } = req.body || {};

    if (!name || !price) {
      return res.status(400).json({ error: 'name and price are required' });
    }

    try {
      // TODO: If imageBase64, upload to Supabase Storage and get URL
      // For now, store as data-URL like in KV mode
      const image_url = imageBase64 ? `data:${imageType};base64,${imageBase64}` : null;

      const { data: product, error } = await supabase
        .from('products')
        .insert({
          name,
          description: description || '',
          price: parseFloat(price),
          category: category || 'General',
          image_url,
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      await kv.del(PRODUCTS_CACHE_KEY).catch(() => {});

      return res.status(201).json({ product });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create product' });
    }
  }

  // ── PUT /api/products (update) ──
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

      // Invalidate cache
      await kv.del(PRODUCTS_CACHE_KEY).catch(() => {});

      return res.status(200).json({ product });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update product' });
    }
  }

  // ── DELETE /api/products (soft delete) ──
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });

    try {
      const { error } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      // Invalidate cache
      await kv.del(PRODUCTS_CACHE_KEY).catch(() => {});

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

---

### 2. api/orders.js (Supabase + Cache)

```javascript
// api/orders.js
// Supabase for storage + Vercel KV for recent orders cache

import { createClient } from '@vercel/kv';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const ORDERS_CACHE_KEY = 'iyvix:orders:cache';
const CACHE_TTL = 5 * 60; // 5 minutes

function getKV() {
  return createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

function getSupabase() {
  return createSupabaseClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function isAuthorised(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload.v === 1 && (Date.now() - payload.iat) < 8 * 60 * 60 * 1000;
  } catch {
    return false;
  }
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
  const kv = getKV();

  // ── GET /api/orders ──
  if (req.method === 'GET') {
    try {
      // Try cache first
      const cached = await kv.get(ORDERS_CACHE_KEY).catch(() => null);
      if (cached) {
        return res.status(200).json({ orders: cached });
      }

      // Fetch from Supabase
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cache result
      await kv.setex(ORDERS_CACHE_KEY, CACHE_TTL, orders || []).catch(() => {});

      return res.status(200).json({ orders: orders || [] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }

  // ── POST /api/orders (create) ──
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

      // Invalidate cache
      await kv.del(ORDERS_CACHE_KEY).catch(() => {});

      return res.status(201).json({ order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to create order' });
    }
  }

  // ── PUT /api/orders (update status) ──
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

      // Invalidate cache
      await kv.del(ORDERS_CACHE_KEY).catch(() => {});

      return res.status(200).json({ order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update order' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

---

### 3. api/settings.js (Supabase)

```javascript
// api/settings.js
// Get/set site settings from Supabase

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SETTINGS = {
  storeName: 'IYVIX',
  tagline: 'Objects of consequence.',
  logoUrl: '/assets/iyvix_logo.png',
  accentColor: '#c9a84c',
  contactEmail: '',
  socialX: '',
  socialIG: '',
  maintenanceMode: false,
};

function getSupabase() {
  return createSupabaseClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function isAuthorised(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload.v === 1 && (Date.now() - payload.iat) < 8 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabase();

  // ── GET /api/settings (public) ──
  if (req.method === 'GET') {
    try {
      const { data: rows, error } = await supabase
        .from('site_settings')
        .select('key, value');

      if (error) throw error;

      // Merge database settings with defaults
      const settings = { ...DEFAULT_SETTINGS };
      rows?.forEach(row => {
        settings[row.key] = row.value;
      });

      return res.status(200).json({ settings });
    } catch (err) {
      console.error(err);
      return res.status(200).json({ settings: DEFAULT_SETTINGS });
    }
  }

  // ── PUT /api/settings (admin only) ──
  if (req.method === 'PUT') {
    if (!isAuthorised(req)) {
      return res.status(401).json({ error: 'Unauthorised' });
    }

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
```

---

## How to Apply These Changes

### Option 1: Replace One File at a Time
1. Copy the code from above for one endpoint
2. Replace the file in `/api/`
3. Test locally: `npm run dev`
4. Push to GitHub and redeploy to Vercel

### Option 2: Stay with Current Setup
If Vercel KV is working fine, you don't need to change anything. This guide is optional!

---

## Monitoring & Debugging

### Check Supabase Usage
1. Go to Supabase dashboard → **Database** → **Logs**
2. Run a test query to see if the API is connecting

### Check Vercel Logs
1. Go to Vercel project → **Deployments** → latest → **Logs**
2. Look for any errors from your API

### Test Manually
```bash
# Get all products (should show Supabase data)
curl https://iyvix-store.vercel.app/api/products

# Get settings (should show from Supabase)
curl https://iyvix-store.vercel.app/api/settings
```

---

## Rollback to KV Only

If you want to go back to the original Vercel KV setup:

1. Restore the original API files from git history
2. Remove the Supabase environment variables
3. Redeploy

```bash
git checkout api/
git push
```

---

**Last updated:** March 18, 2026
