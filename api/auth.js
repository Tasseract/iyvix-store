// api/auth.js
// Phase 1: simple hardcoded credential check.
// Phase 2: swap body of verifyPassword() for a Supabase auth call.

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const valid = verifyPassword(username, password);

  if (!valid) {
    // Throttle brute-force attempts slightly
    await new Promise(r => setTimeout(r, 600));
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // In Phase 2 replace this with a signed JWT or Supabase session token.
  // For Phase 1 we issue a simple timestamped token the client stores in
  // sessionStorage and sends back on subsequent requests.
  const token = Buffer.from(
    JSON.stringify({ user: username, iat: Date.now(), v: 1 })
  ).toString('base64');

  return res.status(200).json({ token, user: username });
}

/**
 * Phase 1 — credentials are set via Vercel Environment Variables:
 *   ADMIN_USER     (default: "admin")
 *   ADMIN_PASSWORD (default: "iyvix2026" — CHANGE THIS in Vercel dashboard)
 *
 * Phase 2 — replace with:
 *   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
 */
function verifyPassword(username, password) {
  const expectedUser = process.env.ADMIN_USER     || 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD || 'iyvix2026';
  return username === expectedUser && password === expectedPass;
}
