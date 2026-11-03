/**
 * tools/build_colorado_p1_sfx.mjs
 * -------------------------------
 * Node.js companion runner for `tools/build_colorado_p1_sfx.py`:
 * Generates the 8 Page 1 sound effects in `public/assets/audio/colorado/sfx/`
 * using `ELEVENLABS_API_KEY` from `.env` (`POST https://api.elevenlabs.io/v1/sound-generation`).
 * Never modifies or regenerates Page 1's voice narration MP3!
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

const P1_SFX_SPECS = [
  [
    'p1_ambient_idle.mp3',
    'Soft cozy low SUV engine idle hum blended with gentle autumn mountain breeze and distant birdsong',
    6.0
  ],
  [
    'p1_exhaust_rev.mp3',
    'Playful friendly car engine double rev vroom-vroom with soft puffing exhaust smoke',
    2.0
  ],
  [
    'p1_thule_sparky.mp3',
    'Cargo box latch popping open, rubber party balloons inflating and floating up, and a cute baby dragon happy chirp',
    2.5
  ],
  [
    'p1_doggie_bark.mp3',
    'Cute small stuffed toy puppy squeaky double bark yip-yip with a playful suitcase thump',
    1.8
  ],
  [
    'p1_bluebird_chirp.mp3',
    'Metallic road sign wobble boing followed by cheerful mountain bluebird melody chirp and fluttering wings',
    2.0
  ],
  [
    'p1_eagle_soar.mp3',
    'Majestic mountain hawk eagle cry echoing softly over open canyon sky with gentle wing whoosh',
    2.5
  ],
  [
    'p1_chipmunk_munch.mp3',
    'Cute cartoon chipmunk fast crunchy nibbling on a pinecone followed by a playful little boing flip',
    2.0
  ],
  [
    'p1_cooler_pop.mp3',
    'Plastic camping cooler lid popping open with a refreshing cold fizz and playful magical chime',
    2.0
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

  for (const [filename, prompt, durationSeconds] of P1_SFX_SPECS) {
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
    console.log(`  [GENERATED P1 SFX] sfx/${filename} (${buf.length.toLocaleString()} bytes) — '${prompt}'`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
