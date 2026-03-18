# IYVIX Deployment Checklist

**Target:** Deploy to Vercel + Supabase (hybrid with Vercel KV)
**Admin Credentials:** `Admin` / `Admin123`
**GitHub:** `Tasseract/iyvix-store`

---

## Phase 1: Setup GitHub & Vercel

- [ ] **Initialize Git**
  ```bash
  cd /Users/jhalentroy/Desktop/iyvix
  git init
  git add .
  git commit -m "Initial IYVIX deployment"
  git remote add origin https://github.com/Tasseract/iyvix-store.git
  git push -u origin main
  ```

- [ ] **Create Vercel Project**
  - Visit vercel.com
  - Import `Tasseract/iyvix-store` repository
  - Framework: `Other` (build command blank)
  - Deploy

- [ ] **Add Vercel KV Store**
  - Vercel dashboard → Storage → Create KV Store
  - Name: `iyvix-kv`
  - Connect to project
  - ✓ Env vars auto-injected: `KV_REST_API_URL`, `KV_REST_API_TOKEN`

---

## Phase 2: Setup Supabase

- [ ] **Create Supabase Project**
  - Visit supabase.com → New Project
  - Name: `iyvix`
  - Database password: [strong password]
  - Region: [your preference]
  - Wait ~2 minutes for setup

- [ ] **Create Database Tables**
  - Go to Supabase SQL Editor
  - Copy & paste SQL from **DEPLOYMENT_GUIDE.md** (Step 3c)
  - Run

- [ ] **Get Supabase Credentials**
  - Settings → API
  - Copy: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Settings → Database
  - Copy: `DATABASE_URL` (connection string)

---

## Phase 3: Configure Vercel Environment Variables

Add to Vercel project → Settings → Environment Variables:

| Variable | Value | From |
|----------|-------|------|
| `ADMIN_USER` | `Admin` | Static |
| `ADMIN_PASSWORD` | `Admin123` | Static |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Settings → API |
| `SUPABASE_ANON_KEY` | `eyJ0...` | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ0...` | Supabase Settings → API |
| `DATABASE_URL` | `postgresql://...` | Supabase Settings → Database |

*Note: `KV_REST_API_URL` and `KV_REST_API_TOKEN` are auto-added by Vercel*

- [ ] All variables added
- [ ] Env vars marked for "Production" environment

---

## Phase 4: Deploy & Test

- [ ] **Redeploy to Vercel**
  - Vercel Deployments tab → ⋯ on latest → Redeploy
  - Wait for deployment to complete

- [ ] **Test Storefront**
  - [ ] Home page: `https://iyvix-store.vercel.app/`
  - [ ] Shop: `https://iyvix-store.vercel.app/shop`
  - [ ] Music: `https://iyvix-store.vercel.app/music`

- [ ] **Test Admin Panel**
  - [ ] Visit: `https://iyvix-store.vercel.app/admin`
  - [ ] Login: `Admin` / `Admin123`
  - [ ] Try adding a test product

- [ ] **Test API (optional)**
  - [ ] GET `/api/products` (should return empty array or cached data)
  - [ ] POST `/api/auth` with credentials
  - [ ] Use token to POST product

---

## Phase 5: Optional - Integrate Supabase in APIs

**Only do this if you want:**
- Permanent storage in Supabase Postgres instead of KV
- Better query performance + scalability
- Cache layer via Vercel KV

See **API_INTEGRATION_GUIDE.md** for step-by-step code changes.

- [ ] `npm install @supabase/supabase-js`
- [ ] Update `api/products.js` to use Supabase
- [ ] Update `api/orders.js` to use Supabase
- [ ] Update `api/settings.js` to use Supabase
- [ ] Test locally: `npm run dev`
- [ ] Push to GitHub and redeploy

---

## Reference URLs

| Resource | URL |
|----------|-----|
| **GitHub** | https://github.com/Tasseract/iyvix-store |
| **Vercel** | https://iyvix-store.vercel.app |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Supabase Dashboard** | https://supabase.com/dashboard |
| **Live Site** | https://iyvix-store.vercel.app |
| **Admin Panel** | https://iyvix-store.vercel.app/admin |

---

## Support Files

Created for you:
- ✅ **DEPLOYMENT_GUIDE.md** — Full step-by-step deployment (this directory)
- ✅ **API_INTEGRATION_GUIDE.md** — How to use Supabase in your API (optional)
- ✅ **api/supabase.js** — Supabase client helper (optional)
- ✅ **CHECKLIST.md** — This checklist

---

**Start with:** Push to GitHub (Phase 1) → Create Vercel project → Create Supabase project → Add env vars → Test!

Questions? Check **DEPLOYMENT_GUIDE.md** Troubleshooting section.
