// simulate_create.mjs
// Runs the /api/products handler locally with a mock POST to reproduce errors.
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { default: handler } = await import(path.join(__dirname, 'api', 'products.js'));

// Build a valid token expected by isAuthorised()
const token = Buffer.from(JSON.stringify({ user: 'admin', iat: Date.now(), v: 1 })).toString('base64');

const req = {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: { name: 'SIM Test', description: 'Simulated create', price: '19.99', category: 'Gadgets & Tech' }
};

const res = {
  headers: {},
  statusCode: 200,
  setHeader(k, v) { this.headers[k] = v; },
  status(code) { this.statusCode = code; return this; },
  json(obj) { console.log('--- HANDLER JSON RESPONSE ---'); console.log('status:', this.statusCode); console.log(JSON.stringify(obj, null, 2)); },
  end() { console.log('--- END ---'); }
};

try {
  await handler(req, res);
} catch (err) {
  console.error('--- HANDLER THREW ---');
  console.error(err && err.stack ? err.stack : err);
}
