# IYVIX — Deployment Guide

## What's in this project

```
iyvix/
├── index.html          ← Landing page
├── catalogue.html      ← Product catalogue
├── music.html          ← Music storefront
├── admin/
│   └── index.html      ← Admin dashboard (login-protected)
├── assets/
│   └── iyvix_logo.png  ← Brand logo
├── api/
│   ├── auth.js         ← Login endpoint
│   ├── products.js     ← Products CRUD
│   ├── orders.js       ← Orders management
│   └── settings.js     ← Site settings
├── vercel.json         ← Vercel routing
├── package.json
└── README.md           ← This file
```

---

## STEP 1 — Push to GitHub

1. Create a new **private** repository on GitHub (e.g. `iyvix-store`)
2. In your terminal, from inside this folder:

```bash
git init
git add .
git commit -m "Initial IYVIX deployment"
git remote add origin https://github.com/YOUR_USERNAME/iyvix-store.git
git push -u origin main
```

---

## STEP 2 — Deploy to Vercel

1. Go to **vercel.com** → **Add New Project**
2. Import your `iyvix-store` GitHub repository
3. Framework preset: **Other** (leave build command blank)
4. Click **Deploy**

Your site will be live at `https://iyvix-store.vercel.app` in ~60 seconds.

---

## STEP 3 — Add Vercel KV (database for products/orders/settings)

1. In your Vercel project dashboard → **Storage** tab
2. Click **Create KV Store** → name it `iyvix-kv`
3. Click **Connect to Project** → select your project
4. Vercel automatically injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` as environment variables

That's it — the API endpoints will now persist data.

---

## STEP 4 — Set Admin Credentials

1. Vercel project dashboard → **Settings** → **Environment Variables**
2. Add these two variables:

| Name             | Value              | Environment |
|------------------|--------------------|-------------|
| `ADMIN_USER`     | your-admin-username | Production  |
| `ADMIN_PASSWORD` | a-strong-password   | Production  |

3. **Redeploy** (Deployments tab → ⋯ → Redeploy) for env vars to take effect

> ⚠️  The default password is `iyvix2026`. Change this before sharing the URL.

---

## STEP 5 — Access your admin

Visit: `https://your-domain.vercel.app/admin`

Login with the credentials you set in Step 4.

---

## Custom Domain (optional)

1. Vercel project → **Settings** → **Domains**
2. Add `iyvix.com` (or your domain)
3. Follow the DNS instructions (add a CNAME or A record at your registrar)

---

## Phase 2 Roadmap

When you're ready to add real e-commerce:

### Stripe (payments)
```bash
npm install stripe
```
- Create `api/checkout.js` — creates a Stripe Checkout Session
- Create `api/webhook.js` — listens for `payment_intent.succeeded`, writes order to KV
- Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Vercel env vars

### Supabase (scale up from KV)
```bash
npm install @supabase/supabase-js
```
- Migrate products/orders/settings to Supabase Postgres tables
- Replace KV calls in `api/products.js`, `api/orders.js`, `api/settings.js` with Supabase queries
- Use Supabase Auth to replace the simple token system
- Use Supabase Storage for product images (instead of base64 in KV)

### Environment variables to add later
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Local Development

```bash
npm install
npm run dev   # starts vercel dev on localhost:3000
```

You can log in locally with the default credentials (`admin` / `iyvix2026`)  
without KV connected — it falls back to in-memory/offline mode gracefully.

---

## File URLs once deployed

| Page       | URL                          |
|------------|------------------------------|
| Home       | `/`                          |
| Shop       | `/shop` or `/catalogue.html` |
| Music      | `/music`                     |
| Admin      | `/admin`                     |
| API: auth  | `POST /api/auth`             |
| API: products | `GET/POST/PUT/DELETE /api/products` |
| API: orders   | `GET/POST/PUT /api/orders`         |
| API: settings | `GET/PUT /api/settings`            |
