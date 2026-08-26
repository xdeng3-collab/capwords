#!/usr/bin/env node
/**
 * Test harness for the core capture-and-learn flow.
 *
 * Loads the app's REAL aiService.js (via a babel CJS transform, so we test the
 * exact prompt/model the app ships with) and runs recognizeAndTranslate()
 * against the live DeepSeek API with sample photos.
 *
 * Usage:
 *   node scripts/test-ai.js                 # test all sample images, Spanish
 *   node scripts/test-ai.js path/to/img.jpg Japanese
 *
 * Requires EXPO_PUBLIC_DEEPSEEK_API_KEY in .env (loaded automatically).
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..');

// Load .env the same way Expo does (EXPO_PUBLIC_* into process.env).
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Require the app's ES modules through babel so we test the real code.
function loadAppModule(relPath) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformFileSync(file, {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
    babelrc: false,
    configFile: false,
  });
  const mod = { exports: {} };
  const fn = new Function('module', 'exports', 'require', code);
  fn(mod, mod.exports, (id) =>
    id.startsWith('.') ? loadAppModule(path.join(path.dirname(relPath), id) + '.js') : require(id)
  );
  return mod.exports;
}

const SAMPLE_IMAGES = [
  // Public-domain / CC sample photos of everyday objects.
  { name: 'apple', url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Red_Apple.jpg?width=640' },
  { name: 'coffee cup', url: 'https://commons.wikimedia.org/wiki/Special:FilePath/A_small_cup_of_coffee.JPG?width=640' },
  { name: 'dog', url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Labrador_Retriever_portrait.jpg?width=640' },
];

async function imageToBase64(source) {
  if (fs.existsSync(source)) return fs.readFileSync(source).toString('base64');
  const res = await fetch(source);
  if (!res.ok) throw new Error(`Failed to download ${source}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer()).toString('base64');
}

const REQUIRED_FIELDS = ['word', 'pronunciation', 'english', 'exampleSentence', 'sentenceTranslation', 'funFact'];

async function main() {
  const { recognizeAndTranslate } = loadAppModule('src/services/aiService.js');
  const config = loadAppModule('src/config.js');

  if (!config.DEEPSEEK_API_KEY) {
    console.error('FAIL: EXPO_PUBLIC_DEEPSEEK_API_KEY is not set (.env missing?)');
    process.exit(1);
  }
  console.log(`Vision model: ${config.DEEPSEEK_VISION_MODEL}`);

  const [customImage, language = 'Spanish'] = process.argv.slice(2);
  const targets = customImage
    ? [{ name: path.basename(customImage), url: customImage }]
    : SAMPLE_IMAGES;

  let failures = 0;
  for (const { name, url } of targets) {
    process.stdout.write(`\n=== ${name} (${language}) ===\n`);
    try {
      const base64 = await imageToBase64(url);
      const start = Date.now();
      const result = await recognizeAndTranslate(base64, language);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(JSON.stringify(result, null, 2));
      const missing = REQUIRED_FIELDS.filter((f) => !result[f]);
      if (missing.length) {
        failures++;
        console.log(`✗ FAIL (${elapsed}s) — missing fields: ${missing.join(', ')}`);
      } else {
        console.log(`✓ PASS (${elapsed}s)`);
      }
    } catch (err) {
      failures++;
      console.log(`✗ FAIL — ${err.message}`);
    }
  }
  console.log(`\n${failures === 0 ? 'All tests passed.' : `${failures} test(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
