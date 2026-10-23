import { withSupabase } from 'npm:@supabase/server'

/**
 * The production DeepSeek proxy: the same job as server/index.js, run where
 * the key can actually stay secret.
 *
 * The app sends the OpenAI-style chat body it would otherwise send to
 * DeepSeek; this function checks who is asking, counts the request, attaches
 * DEEPSEEK_API_KEY (a function secret - it never ships in the app) and passes
 * the request through. Nothing is stored: the photo and the answer go through
 * memory and are gone. The only thing written anywhere is a hit counter (see
 * migrations/20261022000000_ai_usage.sql).
 *
 * Who may call it. Accounts are optional in Voyaword and recognising a photo
 * is not, so this accepts either
 *   - a signed-in user's JWT on Authorization  -> limited per user, or
 *   - the app's publishable key on apikey      -> limited per install and per IP.
 * The publishable key is public by design, so the second path is not access
 * control; the limits are what bound it, and the project-wide daily cap is
 * the hard ceiling on spend whatever else goes wrong. An expired JWT falls
 * through to the publishable path rather than failing.
 *
 * verify_jwt is off (supabase/config.toml): the platform check only
 * understands JWTs, and the publishable key is not one. withSupabase does the
 * checking instead.
 *
 * Deploy with:  npx supabase functions deploy ai-proxy --no-verify-jwt
 * Secret:       npx supabase secrets set DEEPSEEK_API_KEY=...   (type it, do not paste it into chat)
 */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
// Keep in sync with src/config/env.js and server/index.js.
const ALLOWED_MODELS = new Set(['deepseek-flash', 'deepseek-v4-pro'])
const MAX_BODY_BYTES = 15 * 1024 * 1024
// The app asks for at most 2000; anything above this is not the app.
const MAX_TOKENS_CEILING = 4000
const MAX_MESSAGES = 10
const UPSTREAM_TIMEOUT_MS = 60_000

const HOUR = 60 * 60
const DAY = 24 * HOUR
const limit = (name: string, fallback: number) => Number(Deno.env.get(name) ?? fallback)
const LIMITS = {
  user: limit('AI_LIMIT_USER_PER_HOUR', 120),
  device: limit('AI_LIMIT_DEVICE_PER_HOUR', 60),
  // Generous because one carrier NAT address can hide a lot of phones.
  ip: limit('AI_LIMIT_IP_PER_HOUR', 300),
  global: limit('AI_LIMIT_GLOBAL_PER_DAY', 5000),
}

function fail(status: number, message: string) {
  // Same shape as DeepSeek's errors, so api/deepseekClient.js shows the message.
  return Response.json({ error: { message } }, { status })
}

// Bucket names are an HMAC of the identity, so the counter table never holds
// a raw IP address or install id. Keyed with the project's secret key, which
// the function already has; rotating it just resets the counters.
let hmacKey: Promise<CryptoKey> | null = null
function bucketKey() {
  if (!hmacKey) {
    let secret = Deno.env.get('AI_USAGE_SALT') ?? ''
    if (!secret) {
      try {
        secret = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? ''
      } catch {
        // fall through to the legacy key
      }
    }
    secret = secret || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!secret) throw new Error('No key available to hash rate-limit buckets')
    hmacKey = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
  }
  return hmacKey
}

async function bucket(identity: string) {
  const sig = await crypto.subtle.sign('HMAC', await bucketKey(), new TextEncoder().encode(identity))
  return Array.from(new Uint8Array(sig).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Best effort. Clients can prepend to X-Forwarded-For, so this bucket slows a
// casual loop rather than stopping a determined one - the daily cap does that.
function clientIp(req: Request) {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = req.headers.get('x-forwarded-for')
  return xff ? xff.split(',')[0].trim() : ''
}

// Accept only what the app actually sends: anything else is rebuilt or refused.
function sanitize(body: any): { body?: Record<string, unknown>; error?: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid body' }
  if (!ALLOWED_MODELS.has(body.model)) return { error: `Model not allowed: ${body.model}` }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return { error: 'Invalid messages' }
  }
  const out: Record<string, unknown> = { model: body.model, messages: body.messages }
  if (typeof body.temperature === 'number') out.temperature = body.temperature
  if (body.response_format?.type === 'json_object') out.response_format = { type: 'json_object' }
  const maxTokens = Number(body.max_tokens)
  out.max_tokens = Number.isFinite(maxTokens) && maxTokens > 0
    ? Math.min(Math.floor(maxTokens), MAX_TOKENS_CEILING)
    : MAX_TOKENS_CEILING
  return { body: out }
}

export default {
  fetch: withSupabase({ auth: ['user', 'publishable'] }, async (req, ctx) => {
    if (req.method !== 'POST' || !new URL(req.url).pathname.endsWith('/v1/chat/completions')) {
      return fail(404, 'Not found')
    }

    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!apiKey) {
      console.error('ai-proxy: DEEPSEEK_API_KEY secret is not set')
      return fail(503, 'AI is not available right now.')
    }

    const declared = Number(req.headers.get('content-length') ?? 0)
    if (declared > MAX_BODY_BYTES) return fail(413, 'Photo too large')
    const raw = await req.text()
    if (raw.length > MAX_BODY_BYTES) return fail(413, 'Photo too large')

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return fail(400, 'Invalid JSON')
    }
    const { body, error } = sanitize(parsed)
    if (!body) return fail(400, error ?? 'Invalid body')

    // Who is this, for counting purposes. The global bucket goes last - see
    // ai_usage_take for why the order matters.
    const buckets: string[] = []
    const windows: number[] = []
    const limits: number[] = []
    const add = async (identity: string, windowSeconds: number, max: number) => {
      buckets.push(await bucket(identity))
      windows.push(windowSeconds)
      limits.push(max)
    }
    const userId = ctx.authMode === 'user' ? (ctx.userClaims?.id ?? ctx.jwtClaims?.sub) : null
    if (userId) {
      await add(`user:${userId}`, HOUR, LIMITS.user)
    } else {
      const install = req.headers.get('x-capwords-install') ?? ''
      if (/^[A-Za-z0-9-]{8,64}$/.test(install)) await add(`device:${install}`, HOUR, LIMITS.device)
      const ip = clientIp(req)
      if (ip) await add(`ip:${ip}`, HOUR, LIMITS.ip)
    }
    await add('global', DAY, LIMITS.global)

    const { data: full, error: rpcError } = await ctx.supabaseAdmin.rpc('ai_usage_take', {
      p_buckets: buckets,
      p_windows: windows,
      p_limits: limits,
    })
    if (rpcError) {
      // Fail closed: without the counter there is no ceiling on spend.
      console.error('ai-proxy: rate limit check failed', rpcError.message)
      return fail(503, 'AI is not available right now.')
    }
    if (full) {
      return fail(429, 'Too many requests - please try again in a little while.')
    }

    try {
      const upstream = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      console.error('ai-proxy: upstream error', (err as Error).message)
      return fail(502, 'Could not reach the AI service.')
    }
  }),
}
