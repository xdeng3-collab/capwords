import {
  API_PROXY_TOKEN,
  API_PROXY_URL,
  DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from '../config';
import { supabase } from './supabaseClient';

/**
 * The HTTP side of talking to DeepSeek: where to send it, which credential to
 * present, and how to turn a failure into something readable. Prompts and
 * what the answers mean live in services/aiService.js.
 */

/**
 * Floor for max_tokens on every call.
 *
 * DeepSeek's models think before they answer, and the reasoning tokens are
 * charged against max_tokens. When the budget runs out mid-thought the API
 * still returns HTTP 200 - with finish_reason 'length' and an empty content
 * string - so a budget that is too small looks exactly like a model that had
 * nothing to say. Measured reasoning for the app's prompts runs 200-550
 * tokens, so 1500 leaves room for the thinking plus the answer.
 */
export const MIN_ANSWER_TOKENS = 1500;

/**
 * Release builds go through the proxy, full stop. A key in the bundle is a key
 * anyone can lift out of the app, so outside __DEV__ there is no direct path
 * to DeepSeek at all - not even if a key somehow made it into the build.
 * In development, calling DeepSeek directly needs a key; without one the call
 * would come back 401 and look like a recognition failure, so say so plainly.
 */
function assertConfigured() {
  if (API_PROXY_URL) return;
  if (!__DEV__) {
    throw new Error('AI is not configured: release builds must set EXPO_PUBLIC_API_URL to the proxy.');
  }
  if (!DEEPSEEK_API_KEY) {
    throw new Error(
      'AI is not configured: set EXPO_PUBLIC_API_URL to the proxy (see server/index.js).'
    );
  }
}

/** True when the proxy is this project's ai-proxy Edge Function. */
function proxyIsSupabase() {
  return Boolean(SUPABASE_URL && API_PROXY_URL.startsWith(`${SUPABASE_URL.replace(/\/+$/, '')}/functions/`));
}

/**
 * Headers for an AI call. Against a proxy the app carries no DeepSeek key at
 * all - the proxy holds it:
 *  - the ai-proxy Edge Function wants the publishable key on `apikey`, plus
 *    the signed-in person's session token when there is one (it limits per
 *    user then, and per install otherwise);
 *  - the laptop proxy (server/index.js) wants its shared token.
 * Talking to DeepSeek directly is the development-only path and needs the key.
 */
async function authHeaders({ installId } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (API_PROXY_URL) {
    if (proxyIsSupabase()) {
      headers.apikey = SUPABASE_ANON_KEY;
      const session = supabase ? (await supabase.auth.getSession().catch(() => null))?.data?.session : null;
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    } else if (API_PROXY_TOKEN) {
      headers['X-Capwords-Token'] = API_PROXY_TOKEN;
    }
    if (installId) headers['X-Capwords-Install'] = installId;
  } else if (__DEV__ && DEEPSEEK_API_KEY) {
    headers.Authorization = `Bearer ${DEEPSEEK_API_KEY}`;
  }
  return headers;
}

/**
 * Turn a failed response into a message worth reading. DeepSeek puts the useful
 * part (an unknown model id, an expired key) in the body, not the status line.
 */
async function describeError(response) {
  let detail = '';
  try {
    const body = await response.json();
    detail = body?.error?.message || '';
  } catch (e) {
    // no JSON body to quote
  }
  if (response.status === 401) {
    detail = detail || 'The API key was rejected.';
    return `API Error 401: ${detail} Check DEEPSEEK_API_KEY on the proxy.`;
  }
  if (response.status === 429) {
    return detail || 'Too many requests - please try again in a little while.';
  }
  return detail ? `API Error ${response.status}: ${detail}` : `API Error: ${response.status}`;
}

/**
 * POST a chat completion and return the first choice as
 * { content, finishReason }. Throws with a readable message on HTTP errors.
 * `installId` lets the proxy rate-limit this phone on its own when signed out.
 */
export async function chatCompletion(body, { installId } = {}) {
  assertConfigured();
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: await authHeaders({ installId }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await describeError(response));
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  return { content: choice?.message?.content || '', finishReason: choice?.finish_reason };
}

/** The first {...} block in a model answer, parsed, or null. */
export function extractJSON(content) {
  try {
    const match = (content || '').match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e) {
    return null;
  }
}
