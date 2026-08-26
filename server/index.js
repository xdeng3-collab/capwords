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
// Only these models may be requested through the proxy.
const ALLOWED_MODELS = new Set(['deepseek-v4-flash', 'deepseek-v4-flash-vision-exp']);

if (!API_KEY) {
  console.error('Missing DEEPSEEK_API_KEY (set it in the environment or in capwords/.env)');
  process.exit(1);
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
});
