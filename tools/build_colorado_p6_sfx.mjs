/**
 * tools/build_colorado_p6_sfx.mjs
 * -------------------------------
 * Node.js companion runner for `tools/fix_p5_wind_sfx.py` and `tools/build_colorado_p6_sfx.py`:
 * Generates `p5_gusting_canyon_wind.mp3` (with `prompt_influence: 0.75`) and the 4 supplementary
 * Page 6 single-concept atomic SFX MP3s in `public/assets/audio/colorado/sfx/`.
 *
 * STRICT PROTECTED FILES (NEVER TOUCH OR OVERWRITE):
 * - `public/assets/audio/colorado/sfx/p2_grandparents_hug.mp3`
 * - `public/assets/audio/colorado/sfx/sfx_train_horn.mp3`
 * - `public/assets/audio/colorado/sfx/sfx_train_chug.mp3`
 * - Any existing voice narration files (`page_5.mp3`, `page_6.mp3`, etc.)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

const SFX_SPECS = [
  [
    'p5_gusting_canyon_wind.mp3',
    'Strong rushing high-altitude mountain wind gusting and whistling clearly through a deep rocky canyon',
    10.0,
    0.75
  ],
  [
    'p6_ambient_river_rapids.mp3',
    'Rushing mountain canyon whitewater river rapids flowing steadily',
    10.0,
    0.45
  ],
  [
    'p6_otter_splash.mp3',
    'Playful river water splash with a cute happy otter chirp',
    1.8,
    0.45
  ],
  [
    'p6_conductor_doggie_bell.mp3',
    'Bright brass train conductor hand-bell ding-ding with a cute toy puppy squeak yip',
    1.8,
    0.45
  ],
  [
    'p6_kids_horn_laugh.mp3',
    'Happy 4-year-old boy and 3-year-old toddler girl laughing joyfully',
    1.8,
    0.45
  ]
];

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    for (const raw of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[k] = v;
    }
  }
  return env;
}

async function main() {
  const force = process.argv.includes('--force');
  const env = loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not found in .env');
  }

  fs.mkdirSync(SFX_DIR, { recursive: true });

  for (const [filename, prompt, durationSeconds, promptInfluence] of SFX_SPECS) {
    const outPath = path.join(SFX_DIR, filename);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024 && !force) {
      console.log(`  [CACHE HIT] sfx/${filename} (${fs.statSync(outPath).size.toLocaleString()} bytes)`);
      continue;
    }
    const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: durationSeconds,
        prompt_influence: promptInfluence
      })
    });
    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`SFX failed for ${filename}: ${res.status} ${errTxt}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(`  [GENERATED SFX] sfx/${filename} (${buf.length.toLocaleString()} bytes) — '${prompt}'`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
