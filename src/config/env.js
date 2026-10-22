/**
 * Build-time environment: API endpoints, keys and feature flags.
 *
 * Everything here comes from EXPO_PUBLIC_* variables in .env, which Expo
 * inlines into the bundle. Read the comments before putting anything secret in.
 */

// ==================== DeepSeek ====================
//
// EXPO_PUBLIC_* variables are inlined into the JavaScript bundle at build time,
// so anything set here is readable by anyone who unpacks the installed app. A
// real key therefore belongs ONLY on the proxy - the ai-proxy Edge Function's
// DEEPSEEK_API_KEY secret in production, or DEEPSEEK_API_KEY (no prefix) for
// server/index.js on a laptop - never here.
//
// EXPO_PUBLIC_DEEPSEEK_API_KEY survives purely as a local shortcut for talking
// to DeepSeek directly from a dev build, and only from .env.development.local,
// which release builds do not read. Two guards keep it out of releases:
// app.config.js fails a production build that has it set, and the __DEV__
// check below compiles the value out of a release bundle regardless.
export const DEEPSEEK_API_KEY = __DEV__ ? process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || '' : '';
// Where AI calls go. In release builds this must be set - to the ai-proxy
// Edge Function (https://<project>.supabase.co/functions/v1/ai-proxy) - and
// api/deepseekClient.js refuses to call DeepSeek directly without it.
export const API_PROXY_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
// Shared secret for the laptop proxy (server/index.js), matching
// CAPWORDS_PROXY_TOKEN there. It ships in the bundle and is not real access
// control - it turns anonymous crawlers away, nothing more. The Edge Function
// does not use it: it checks the Supabase session or publishable key instead.
export const API_PROXY_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || '';
export const DEEPSEEK_BASE_URL = API_PROXY_URL ? `${API_PROXY_URL}/v1` : 'https://api.deepseek.com/v1';
// DeepSeek publishes exactly two model ids: 'deepseek-flash' and
// 'deepseek-v4-pro' (GET /v1/models). deepseek-flash is multimodal - it accepts
// image_url content blocks - so it serves both photo recognition and the
// text-only calls. Do not invent suffixed names like 'deepseek-v4-flash-vision-exp':
// the API quietly resolves some of them back to deepseek-flash, which hides the
// mistake until the day it stops resolving.
//
// Both models reason before answering, and those reasoning tokens are billed
// against max_tokens. A budget that is too small returns finish_reason:'length'
// with an EMPTY content string rather than an error, so every call site below
// must leave real headroom. See MIN_ANSWER_TOKENS in api/deepseekClient.js.
export const DEEPSEEK_VISION_MODEL = 'deepseek-flash';
export const DEEPSEEK_MODEL = 'deepseek-flash';

// ==================== Supabase ====================
// Accounts, the progress mirror friends can see, and the friend graph.
// The publishable key is designed to ship inside the app bundle - Row Level
// Security (see supabase/migrations/) is what actually keeps
// one person out of another's rows, not the secrecy of this string.
// Both empty means "no backend": the app stays fully usable on-device and the
// account screens hide themselves.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Whether to offer "Sign in with Apple".
//
// Off by default, and it has to stay off until the Apple Developer Program
// membership is paid for. Two reasons it cannot just be detected at runtime:
// AppleAuthentication.isAvailableAsync() reports on the *device* (true on any
// iOS 13+ phone), not on whether this build carries the entitlement; and
// adding that entitlement to app.json breaks signing outright on a free
// personal team. So it is a deliberate switch, flipped alongside the other
// three steps in supabase/README.md.
export const APPLE_SIGN_IN_ENABLED = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === 'true';
