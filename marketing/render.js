// Renders every frame in frames.js to marketing/out/<file>.png with headless
// Chrome. Run from the repo root: node marketing/render.js [file ...]
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SIZES, FRAMES } = require('./frames');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HERE = __dirname;
const OUT = path.join(HERE, 'out');

// The app's own palette (src/theme/colors.js).
const THEMES = {
  sea: { bg: '#5D8FC4', fg: '#FBF3E0', kicker: '#F2C14E', wave: '#8FC6E8' },
  sand: { bg: '#F3E9D2', fg: '#4A3826', kicker: '#C98A3B', wave: '#EADBBB' },
  leaf: { bg: '#7CB06A', fg: '#FBF3E0', kicker: '#3A2A1A', wave: '#4E7B45' },
  sun: { bg: '#F2C14E', fg: '#3A2A1A', kicker: '#8C5A22', wave: '#E8B873' },
  berry: { bg: '#B5638F', fg: '#FBF3E0', kicker: '#F2C14E', wave: '#D96C6C' },
};

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

function phone(screen, style) {
  const src = 'file://' + path.join(HERE, 'screens', screen);
  return `<div class="phone" style="${style}"><img src="${src}"></div>`;
}

// A picture that is not a phone screen (e.g. the journey's places), on a panel.
function board(art, style) {
  const src = 'file://' + path.join(HERE, '..', art);
  return `<div class="board" style="${style}"><img src="${src}"></div>`;
}

function html(frame) {
  const { width: W, height: H } = SIZES[frame.size];
  const t = THEMES[frame.theme];
  const isCover = frame.size === 'xhs';
  // A 1206x2622 capture keeps its shape; the phone is sized off the canvas width.
  const phoneW = isCover ? W * 0.47 : W * 0.78;
  const titleSize = isCover ? 104 : 116;
  const phones = isCover
    ? phone(
        frame.screen,
        `width:${phoneW}px; left:${W * 0.05}px; top:${H * 0.44}px; transform:rotate(-6deg)`,
      ) +
      phone(
        frame.secondScreen,
        `width:${phoneW}px; right:${W * 0.05}px; top:${H * 0.5}px; transform:rotate(5deg)`,
      )
    : frame.art
      ? board(frame.art, `width:${W * 0.88}px; left:${W * 0.06}px; top:${H * 0.25}px`) +
        (frame.note
          ? `<div class="note" style="top:${H * 0.25 + W * 0.88 * frame.artRatio + 90}px">${escape(frame.note)}</div>`
          : '') +
        (frame.scene
          ? board(
              frame.scene,
              `width:${W * 0.88}px; left:${W * 0.06}px; top:${H * 0.25 + W * 0.88 * frame.artRatio + 280}px`,
            )
          : '')
      : phone(frame.screen, `width:${phoneW}px; left:${(W - phoneW) / 2}px; top:${H * 0.215}px`);

  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen&family=Pixelify+Sans:wght@700&family=Noto+Sans+SC:wght@900&display=block">
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
  body { position: relative; background: ${t.bg}; color: ${t.fg}; }
  .waves { position: absolute; inset: auto 0 0 0; height: ${H * 0.4}px;
    background:
      linear-gradient(90deg, ${t.wave} 0 48px, transparent 48px 96px) 0 0 / 96px 12px repeat-x,
      linear-gradient(90deg, transparent 0 48px, ${t.wave} 48px 96px) 0 64px / 96px 12px repeat-x;
    opacity: .55; }
  .copy { position: absolute; left: 0; right: 0; top: ${isCover ? 96 : 210}px; text-align: center; padding: 0 70px; }
  .kicker { font: 400 ${isCover ? 40 : 46}px 'Silkscreen', monospace; letter-spacing: 6px; color: ${t.kicker}; }
  .title { margin-top: 34px; font: 700 ${titleSize}px/1.12 ${isCover ? "'Noto Sans SC'" : "'Pixelify Sans'"}, sans-serif; }
  .phone { position: absolute; border: 16px solid #3A2A1A; border-radius: 86px; overflow: hidden;
    background: #3A2A1A; box-shadow: 26px 26px 0 rgba(58, 42, 26, .28); }
  .phone img { display: block; width: 100%; }
  .board { position: absolute; border: 12px solid #3A2A1A; border-radius: 24px; overflow: hidden;
    background: #F3E9D2; box-shadow: 26px 26px 0 rgba(58, 42, 26, .28); }
  .board img { display: block; width: 100%; }
  .note { position: absolute; left: 90px; right: 90px; text-align: center;
    font: 700 64px/1.3 'Pixelify Sans', sans-serif; }
</style></head><body>
${frame.art ? '' : '<div class="waves"></div>'}
<div class="copy"><div class="kicker">${escape(frame.kicker)}</div><div class="title">${escape(frame.title)}</div></div>
${phones}
</body></html>`;
}

const only = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voyaword-frames-'));
for (const frame of FRAMES) {
  if (only.length && !only.includes(frame.file)) continue;
  const { width, height } = SIZES[frame.size];
  const page = path.join(tmp, `${frame.file}.html`);
  fs.writeFileSync(page, html(frame));
  const png = path.join(OUT, `${frame.file}.png`);
  fs.rmSync(png, { force: true });
  try {
    execFileSync(
      CHROME,
      [
        '--headless=new',
        `--user-data-dir=${path.join(tmp, 'profile')}`,
        '--disable-gpu',
        '--hide-scrollbars',
        '--allow-file-access-from-files',
        '--force-device-scale-factor=1',
        `--window-size=${width},${height}`,
        '--virtual-time-budget=8000',
        `--screenshot=${png}`,
        'file://' + page,
      ],
      { stdio: 'ignore' },
    );
  } catch (error) {
    // Chrome on macOS often exits non-zero on teardown after writing the file.
    if (!fs.existsSync(png)) throw error;
  }
  console.log(`marketing/out/${frame.file}.png`);
}
