import { API_PROXY_URL, DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, DEEPSEEK_VISION_MODEL } from '../config';

/**
 * Floor for max_tokens on every call.
 *
 * DeepSeek's models think before they answer, and the reasoning tokens are
 * charged against max_tokens. When the budget runs out mid-thought the API
 * still returns HTTP 200 - with finish_reason 'length' and an empty content
 * string - so a budget that is too small looks exactly like a model that had
 * nothing to say. Measured reasoning for the prompts below runs 200-550 tokens,
 * so 1500 leaves room for the thinking plus the answer.
 */
const MIN_ANSWER_TOKENS = 1500;

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

/** Thrown when the model answered but we could not get a word out of it. */
export class RecognitionFailedError extends Error {
  constructor(message = 'Could not recognise the photo.') {
    super(message);
    this.name = 'RecognitionFailedError';
  }
}

/**
 * Recognize an object from a photo and return its name in the target language
 * Also returns a description for sticker generation.
 *
 * Throws rather than returning a placeholder: the caller saves the sticker and
 * spends one of the user's words only after this resolves, so a failure here
 * must not look like a success. Charging someone for an "Unknown" sticker is
 * worse than telling them it did not work.
 */
export async function recognizeAndTranslate(imageBase64, targetLanguage) {
  // The model occasionally returns an empty/unparseable answer; one retry
  // makes that invisible to the user.
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await requestRecognition(imageBase64, targetLanguage);
    if (result) return result;
  }
  throw new RecognitionFailedError();
}

async function requestRecognition(imageBase64, targetLanguage) {
  assertConfigured();
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a friendly language tutor inside a photo vocabulary app.
The user snaps a photo of an object to learn its name in ${targetLanguage}.

Identify the single main object in the photo (the most prominent, everyday thing — prefer the concrete noun a beginner would want to learn) and respond with ONLY a JSON object, no other text:
{
  "word": "the object's name in ${targetLanguage}",
  "pronunciation": "phonetic pronunciation (romanization for non-Latin scripts, otherwise IPA)",
  "english": "the English word",
  "description": "brief visual description for sticker",
  "category": "food/animal/object/nature/etc",
  "exampleSentence": "a short, natural, beginner-level sentence in ${targetLanguage} using the word",
  "sentenceTranslation": "English translation of that sentence",
  "funFact": "one surprising, memorable fun fact about this object or its name, max 20 words, in English"
}

Rules:
- The example sentence must be something a learner could actually say in daily life.
- The fun fact should create a memory hook (etymology, culture, or a quirky truth) — never generic filler.
- If the photo is unclear, pick the most likely object; never refuse.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            },
            {
              type: 'text',
              text: `What is this object? Teach me the word in ${targetLanguage}.`
            }
          ]
        }
      ],
      temperature: 0.4,
      // The model spends tokens on reasoning before answering, so the budget
      // must cover thinking + the JSON answer. See MIN_ANSWER_TOKENS.
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(await describeError(response));
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || '';

  // An empty answer with finish_reason 'length' means the reasoning tokens ate
  // the whole budget. Retrying with the same budget would fail identically, so
  // say what actually went wrong instead of burning a second call.
  if (!content && choice?.finish_reason === 'length') {
    throw new RecognitionFailedError(
      'The model ran out of room before answering. Raise max_tokens for this request.'
    );
  }

  try {
    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.word) return parsed;
    }
  } catch (e) {
    // fall through to retry
  }
  return null;
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
 * Generate pronunciation audio description (for TTS guidance)
 */
export async function getPronunciationGuide(word, language) {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a language pronunciation expert. Provide detailed pronunciation guidance.'
        },
        {
          role: 'user',
          content: `How do you pronounce "${word}" in ${language}? Give me:
1. IPA transcription
2. Syllable breakdown
3. Tips for English speakers
Respond in JSON: {"ipa": "...", "syllables": "...", "tips": "..."}`
        }
      ],
      temperature: 0.3,
      max_tokens: MIN_ANSWER_TOKENS,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // ignore parse error
  }
  
  return { ipa: '', syllables: word, tips: '' };
}

/**
 * Evaluate user's pronunciation (compare with expected)
 */
export async function evaluatePronunciation(audioTranscription, expectedWord, language) {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a language pronunciation evaluator. Be encouraging but honest.'
        },
        {
          role: 'user',
          content: `The user tried to say "${expectedWord}" in ${language}. 
Their pronunciation was transcribed as: "${audioTranscription}".
Rate their pronunciation from 1-5 stars and give brief feedback.
Respond in JSON: {"stars": 4, "feedback": "..."}`
        }
      ],
      temperature: 0.5,
      max_tokens: MIN_ANSWER_TOKENS,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // ignore parse error
  }
  
  return { stars: 3, feedback: 'Good try! Keep practicing.' };
}
