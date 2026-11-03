/**
 * tools/build_colorado_p5_sfx.mjs
 * -------------------------------
 * Node.js companion runner for `tools/build_colorado_p5_sfx.py`:
 * Generates the 8 single-concept atomic Page 5 ("Royal Gorge Bridge & Aerial Gondola")
 * sound effects in `public/assets/audio/colorado/sfx/` using `ELEVENLABS_API_KEY` from `.env`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

const P5_SFX_SPECS = [
  [
    'p5_ambient_gorge_wind.mp3',
    'Gentle high-altitude mountain canyon breeze blowing softly across an open vista',
    10.0
  ],
  [
    'p5_gondola_cable_loop.mp3',
    'Smooth rhythmic steel aerial cable car pulley wheels humming and rolling softly along a wire',
    8.0
  ],
  [
    'p5_gondola_bell.mp3',
    'Bright vintage brass aerial tramway ding-ding bell chime',
    1.8
  ],
  [
    'p5_eagle_call.mp3',
    'Majestic high-pitched golden eagle call echoing across a canyon',
    2.0
  ],
  [
    'p5_eagle_wings.mp3',
    'Large bird wings flapping whoosh-whoosh-whoosh in open air',
    1.8
  ],
  [
    'p5_flags_flutter.mp3',
    'Three cloth flags snapping and fluttering briskly in a mountain breeze',
    2.0
  ],
  [
    'p5_raft_splash.mp3',
    'Playful whitewater river rapid splash and wooden paddles dipping in water',
    2.0
  ],
  [
    'p5_doggie_yip.mp3',
    'Cute small stuffed puppy toy cheerful double squeak-bark yip-yip',
    1.5
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

  for (const [filename, prompt, durationSeconds] of P5_SFX_SPECS) {
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
        prompt_influence: 0.45
      })
    });
    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`SFX failed for ${filename}: ${res.status} ${errTxt}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(`  [GENERATED P5 SFX] sfx/${filename} (${buf.length.toLocaleString()} bytes) — '${prompt}'`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
