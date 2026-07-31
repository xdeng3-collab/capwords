import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL } from '../config';

/**
 * Recognize an object from a photo and return its name in the target language
 * Also returns a description for sticker generation
 */
export async function recognizeAndTranslate(imageBase64, targetLanguage) {
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
          content: `You are a visual object recognition and language learning assistant. 
When given an image, identify the main object and provide:
1. The word for this object in ${targetLanguage}
2. The phonetic pronunciation (IPA or romanization)
3. A brief sticker-style description of the object (for display purposes)
4. The word in English (as reference)

Respond in JSON format:
{
  "word": "the word in target language",
  "pronunciation": "phonetic/romanized pronunciation",
  "english": "english word",
  "description": "brief visual description for sticker",
  "category": "food/animal/object/nature/etc"
}`
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
              text: `What is this object? Give me the word in ${targetLanguage}.`
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch (e) {
    // Fallback parsing
    return {
      word: content.split('\n')[0] || 'Unknown',
      pronunciation: '',
      english: '',
      description: 'Object',
      category: 'other',
    };
  }
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
      max_tokens: 200,
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
      max_tokens: 150,
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
