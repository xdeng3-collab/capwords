import {
  API_PROXY_TOKEN,
  API_PROXY_URL,
  DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL,
} from '../config';

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
 * Without a proxy URL the app would call DeepSeek directly, and without a key
 * that call goes out with an empty Authorization header and comes back 401.
 * Say so plainly rather than letting it look like a recognition failure.
 */
function assertConfigured() {
  if (!API_PROXY_URL && !DEEPSEEK_API_KEY) {
    throw new Error(
      'AI is not configured: set EXPO_PUBLIC_API_URL to the proxy (see server/index.js).'
    );
  }
}

/**
 * Headers for an AI call. Against the proxy the app carries no DeepSeek key at
 * all - the proxy holds it - and presents the shared token instead. Talking to
 * DeepSeek directly is the local-development path and needs the key.
 */
function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (API_PROXY_URL) {
    if (API_PROXY_TOKEN) headers['X-Capwords-Token'] = API_PROXY_TOKEN;
  } else if (DEEPSEEK_API_KEY) {
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
  return detail ? `API Error ${response.status}: ${detail}` : `API Error: ${response.status}`;
}

/**
 * POST a chat completion and return the first choice as
 * { content, finishReason }. Throws with a readable message on HTTP errors.
 */
export async function chatCompletion(body) {
  assertConfigured();
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(),
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
