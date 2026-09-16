#!/usr/bin/env node
/**
 * CapWords API proxy.
 *
 * Keeps the DeepSeek API key on the server so it never ships inside the app
 * bundle (EXPO_PUBLIC_* variables are extractable from the app binary).
 *
 * The app sends the same OpenAI-style chat body it would send to DeepSeek;
 * this proxy attaches the key and forwards it. No user photos are stored —
 * requests are passed through and forgotten.
 *
 * Run:   DEEPSEEK_API_KEY=sk-... node server/index.js
 * (or put DEEPSEEK_API_KEY in capwords/.env — it is loaded automatically)
 *
 * Point the app at it by setting in .env:
 *   EXPO_PUBLIC_API_URL=http://<your-mac-ip>:3210
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load ../.env (shared with the Expo app) for local development.
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const API_KEY = process.env.DEEPSEEK_API_KEY || process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;
const PORT = process.env.PORT || 3210;
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
// Only these models may be requested through the proxy. These are the two ids
// DeepSeek actually publishes (GET /v1/models); keep in sync with src/config.js.
const ALLOWED_MODELS = new Set(['deepseek-flash', 'deepseek-v4-pro']);

if (!API_KEY) {
  console.error('Missing DEEPSEEK_API_KEY (set it in the environment or in capwords/.env)');
  process.exit(1);
}

// A shared secret the app must present. Optional, and deliberately modest: the
// app has to carry this string, so anyone who unpacks the bundle can read it.
// It stops drive-by and crawler traffic, not a determined person. The real fix
// is per-user auth - once accounts land, verify the caller's Supabase JWT here
// and drop this. Unset means no check, which is fine on a laptop on your own
// network and not fine anywhere else.
const PROXY_TOKEN = process.env.CAPWORDS_PROXY_TOKEN || '';

// Requests allowed per client per window. This is a paid upstream: without a
// ceiling, one loop - friendly or not - can spend the whole API budget.
const RATE_LIMIT = Number(process.env.CAPWORDS_RATE_LIMIT || 30);
const RATE_WINDOW_MS = 5 * 60 * 1000;
const hits = new Map(); // client -> timestamps within the window

function rateLimited(client) {
  const now = Date.now();
  const recent = (hits.get(client) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(client, recent);
  // Drop idle clients so a long-running proxy does not grow without bound.
  if (hits.size > 1000) {
    for (const [k, v] of hits) {
      if (!v.length || now - v[v.length - 1] > RATE_WINDOW_MS) hits.delete(k);
    }
  }
  return recent.length > RATE_LIMIT;
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true });
  }
  if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
    return json(res, 404, { error: 'Not found' });
  }
  if (PROXY_TOKEN && req.headers['x-capwords-token'] !== PROXY_TOKEN) {
    return json(res, 401, { error: 'Unauthorized' });
  }
  const client = req.socket.remoteAddress || 'unknown';
  if (rateLimited(client)) {
    return json(res, 429, { error: 'Too many requests' });
  }

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > 15 * 1024 * 1024) req.destroy(); // 15 MB cap
  });
  req.on('end', async () => {
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(res, 400, { error: 'Invalid JSON' });
    }
    if (!ALLOWED_MODELS.has(body.model)) {
      return json(res, 400, { error: `Model not allowed: ${body.model}` });
    }
    try {
      const upstream = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: raw,
      });
      const text = await upstream.text();
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      res.end(text);
    } catch (err) {
      json(res, 502, { error: `Upstream error: ${err.message}` });
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CapWords proxy listening on http://0.0.0.0:${PORT}`);
  console.log('Health check: GET /health · Chat: POST /v1/chat/completions');
  console.log(`Rate limit: ${RATE_LIMIT} requests per ${RATE_WINDOW_MS / 60000} min per client`);
  if (!PROXY_TOKEN) {
    console.warn('WARNING: CAPWORDS_PROXY_TOKEN is unset - anyone who can reach');
    console.warn('this port can spend your DeepSeek credit. Fine on a private');
    console.warn('network; set it before exposing this anywhere else.');
  }
});
