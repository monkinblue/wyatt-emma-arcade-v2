/**
 * tools/build_colorado_p4_sfx.mjs
 * -------------------------------
 * Node.js companion runner for `tools/build_colorado_p4_sfx.py`:
 * Generates the 9 single-concept atomic Page 4 ("Eleven Mile Canyon & South Platte River")
 * sound effects in `public/assets/audio/colorado/sfx/` using `ELEVENLABS_API_KEY` from `.env`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

const P4_SFX_SPECS = [
  [
    'p4_ambient_stream.mp3',
    'Gentle crystal clear mountain river stream babbling and flowing softly over smooth creek stones',
    8.0
  ],
  [
    'p4_cessna_prop.mp3',
    'Distant small single-engine propeller airplane humming softly across open mountain sky',
    2.5
  ],
  [
    'p4_water_splash.mp3',
    'Playful barefoot water splash in a shallow clear river stream',
    1.8
  ],
  [
    'p4_kids_giggle_splash.mp3',
    'Happy young toddler joyful giggle',
    1.8
  ],
  [
    'p4_sparky_splash.mp3',
    'Inflatable rubber river tube bobbing in water with a cute happy baby dragon chirp',
    2.0
  ],
  [
    'p4_doggie_reel.mp3',
    'Fishing reel clicking and spinning fast zzzzz-click-click',
    2.0
  ],
  [
    'p4_doggie_bark.mp3',
    'Cute small stuffed toy puppy squeaky double bark yip-yip',
    1.5
  ],
  [
    'p4_bighorn_leap.mp3',
    'Hooves bounding lightly up three rocky mountain cliff steps',
    1.8
  ],
  [
    'p4_dragonfly_zip.mp3',
    'Delicate magical fairy wings fluttering with a soft sparkle chime',
    1.8
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

  for (const [filename, prompt, durationSeconds] of P4_SFX_SPECS) {
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
    console.log(`  [GENERATED P4 SFX] sfx/${filename} (${buf.length.toLocaleString()} bytes) — '${prompt}'`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
