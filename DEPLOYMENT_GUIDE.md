# IYVIX — Vercel + Supabase Deployment Guide

**Your username:** Admin
**Your password:** Admin123
**Hybrid setup:** Vercel KV + Supabase Postgres

---

## STEP 1 — Initialize Git & Push to GitHub

```bash
cd /Users/jhalentroy/Desktop/iyvix

git init
git add .
git commit -m "Initial IYVIX deployment"
git remote add origin https://github.com/Tasseract/iyvix-store.git
git branch -M main
git push -u origin main
```

**GitHub repo:** https://github.com/Tasseract/iyvix-store

---

## STEP 2 — Deploy to Vercel

### 2a. Create Vercel Project
1. Go to **vercel.com** → Sign in / Create account
2. Click **Add New Project**
3. Select **Import GitHub repository**
4. Choose `Tasseract/iyvix-store`
5. **Framework preset:** `Other` (leave build command blank)
6. Click **Deploy**

Your site will be live at `https://iyvix-store.vercel.app` in ~60 seconds.

### 2b. Add Vercel KV Storage
1. Go to your Vercel project → **Storage** tab
2. Click **Create KV Store**
3. Name: `iyvix-kv`
4. Click **Connect to Project** → select your project
5. Vercel will automatically inject `KV_REST_API_URL` and `KV_REST_API_TOKEN` as environment variables

---

## STEP 3 — Set Up Supabase

### 3a. Create Supabase Project
1. Go to **supabase.com** → Sign in / Create account
2. Click **New Project**
3. **Name:** `iyvix` (or your preference)
4. **Database password:** Generate a strong password (save it!)
5. **Region:** Choose closest to your users
6. Click **Create new project** (wait ~2 minutes for setup)

### 3b. Get Connection Credentials
Once your project is created:
1. Go to **Settings** → **Database** in left sidebar
2. Copy the following:
   - **Connection string (URI):** `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
   - **Direct URL:** `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres` (with `?sslmode=require`)
3. Also get **Supabase URL** and **Supabase Anon Key** from **Settings** → **API**

### 3c. Create Database Tables

Go to **SQL Editor** in Supabase and run this SQL:

```sql
-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR DEFAULT 'General',
  image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR NOT NULL,
  customer_email VARCHAR,
  items JSONB DEFAULT '[]',
  total DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR DEFAULT 'pending', -- pending | paid | fulfilled | cancelled
  created_at TIMESTAMP DEFAULT NOW()
);

-- Site settings table
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_settings_key ON site_settings(key);

-- Insert default settings
INSERT INTO site_settings (key, value) VALUES
  ('storeName', '"IYVIX"'),
  ('tagline', '"Objects of consequence."'),
  ('logoUrl', '"/assets/iyvix_logo.png"'),
  ('accentColor', '"#c9a84c"'),
  ('contactEmail', '""'),
  ('socialX', '""'),
  ('socialIG', '""'),
  ('maintenanceMode', 'false');
```

---

## STEP 4 — Add Environment Variables to Vercel

Go to your Vercel project → **Settings** → **Environment Variables**

Add the following:

| Variable | Value | Environment |
|----------|-------|-------------|
| `ADMIN_USER` | `Admin` | Production |
| `ADMIN_PASSWORD` | `Admin123` | Production |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Production |
| `SUPABASE_ANON_KEY` | `eyJ0...` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ0...` (the secret one) | Production |
| `DATABASE_URL` | PostgreSQL connection string | Production |

**Note:** You can find these in Supabase:
- **SUPABASE_URL:** Settings → API → Project URL
- **SUPABASE_ANON_KEY:** Settings → API → `anon` key
- **SUPABASE_SERVICE_ROLE_KEY:** Settings → API → `service_role` key
- **DATABASE_URL:** Settings → Database → Connection string

---

## STEP 5 — Update API Endpoints for Supabase

**Choose one approach:**

### Option A: Hybrid (Recommended for now)
Keep Vercel KV as cache + use Supabase for permanent storage.

### Option B: Supabase Only
Replace all KV calls with Supabase queries.

### Option C: Keep KV Only
Stay with the current Vercel KV setup (skip API changes).

---

### For Option A or B: Install Supabase Client

Add to `package.json`:

```json
"dependencies": {
  "@vercel/kv": "^1.0.0",
  "@supabase/supabase-js": "^2.38.0"
}
```

Then:
```bash
npm install
```

---

## STEP 6 — Redeploy

After adding environment variables:
1. Go to Vercel **Deployments** tab
2. Click ⋮ on the latest deployment → **Redeploy**
3. Wait for redeployment to complete

---

## STEP 7 — Test Everything

### Test the storefront:
- `https://iyvix-store.vercel.app/` → Home page
- `https://iyvix-store.vercel.app/shop` → Shop page
- `https://iyvix-store.vercel.app/music` → Music page

### Test the admin:
- `https://iyvix-store.vercel.app/admin`
- Login with: **Admin** / **Admin123**
- Try adding/editing a product

### Test the API:
```bash
# Get products (public)
curl https://iyvix-store.vercel.app/api/products

# Login
curl -X POST https://iyvix-store.vercel.app/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"Admin","password":"Admin123"}'

# Create product (requires token from login)
curl -X POST https://iyvix-store.vercel.app/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"name":"Test","price":99.99}'
```

---

## File Structure After Deployment

```
iyvix-store/
├── index.html                ← Home page
├── catalogue.html            ← Shop
├── music.html                ← Music
├── admin/index.html          ← Admin (login-protected)
├── assets/iyvix_logo.png     ← Logo
├── api/
│   ├── auth.js               ← Authentication
│   ├── products.js           ← Products CRUD
│   ├── orders.js             ← Orders CRUD
│   └── settings.js           ← Settings CRUD
├── public/                   ← Static files (optional)
├── vercel.json               ← Vercel routing config
├── package.json              ← Dependencies
├── DEPLOYMENT_GUIDE.md       ← This file
└── README.md                 ← Original docs
```

---

## URLs After Deployment

| Page | URL |
|------|-----|
| Home | `https://iyvix-store.vercel.app/` |
| Shop | `https://iyvix-store.vercel.app/shop` |
| Music | `https://iyvix-store.vercel.app/music` |
| Admin | `https://iyvix-store.vercel.app/admin` |
| API: Login | `POST /api/auth` |
| API: Products | `GET/POST/PUT/DELETE /api/products` |
| API: Orders | `GET/POST/PUT /api/orders` |
| API: Settings | `GET/PUT /api/settings` |

---

## Troubleshooting

### "KV_REST_API_URL is undefined"
- Make sure you created a Vercel KV Store and connected it to the project
- Redeploy after connecting

### "Cannot connect to Supabase"
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in Vercel
- Check that the Supabase project is running (not paused)
- Redeploy after adding env vars

### Admin login not working
- Check that `ADMIN_USER` = `Admin` and `ADMIN_PASSWORD` = `Admin123` in Vercel
- If changed, redeploy
- Try clearing browser sessionStorage and logging in again

### Products not loading
- Check Vercel logs: **Deployments** → click deployment → **Logs**
- Make sure KV Store is connected and has data
- Test the API directly: `/api/products`

---

## Next Steps (Phase 2)

When ready to add payment processing:

```bash
npm install stripe
```

Then update the API to:
- Add `api/checkout.js` for Stripe checkout sessions
- Add `api/webhook.js` for Stripe payment confirmations
- Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Vercel

See README.md for Phase 2 roadmap details.

---

**Deployed:** March 18, 2026
**Admin:** Admin / Admin123
**GitHub:** https://github.com/Tasseract/iyvix-store
**Vercel:** https://iyvix-store.vercel.app
