/**
 * tools/build_colorado_p7_p8_sfx.mjs
 * ----------------------------------
 * Node.js companion runner for `tools/build_colorado_p7_p8_sfx.py`.
 * Generates single-concept atomic ElevenLabs SFX for Book 2 — Page 7 & Page 8 Finale.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

const SFX_JOBS = [
  [
    'p7_ambient_nature_breeze.mp3',
    'Peaceful sunny mountain park breeze rustling softly through pine needles',
    10.0
  ],
  [
    'p7_ambient_meadow_birds.mp3',
    'Cheerful songbirds singing and chirping melodically in a sunny outdoor park',
    10.0
  ],
  [
    'p7_bluebirds_chirp.mp3',
    'Two happy mountain bluebirds chirping tweet-tweet-tweet with fluttering wings',
    1.8
  ],
  [
    'p7_sparky_magic_puff.mp3',
    'Cute baby dragon happy chirp with magical twinkling crystal sparkles',
    2.0
  ],
  [
    'p7_doggie_camera_shutter.mp3',
    'Classic mechanical camera shutter click and flash pop with a cute toy puppy squeak yip',
    1.8
  ],
  [
    'p7_wyatt_wow.mp3',
    'Happy 4-year-old little boy excited laugh and cheerful giggle',
    1.8
  ],
  [
    'p7_camels_kiss_harp.mp3',
    'Warm magical glissando harp chord with a cute playful kiss pop sound',
    2.2
  ],
  [
    'p8_pierogi_sizzle_loop.mp3',
    'Comforting steady sound of butter and dumplings frying, sizzling, and crackling gently in a cast iron pan on a stove',
    12.0
  ],
  [
    'p8_cozy_kitchen_guitar.mp3',
    'Warm slow fingerpicked acoustic guitar bedtime lullaby melody, peaceful and cozy',
    14.0
  ]
];

function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    for (const raw of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      env[line.slice(0, idx).trim()] = line
        .slice(idx + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ELEVENLABS_API_KEY in .env');
  }

  fs.mkdirSync(SFX_DIR, { recursive: true });

  for (const [filename, prompt, durationSeconds] of SFX_JOBS) {
    const outPath = path.join(SFX_DIR, filename);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024) {
      console.log(`[SKIP] ${filename} already exists (${fs.statSync(outPath).size.toLocaleString()} bytes)`);
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
        prompt_influence: 0.55
      })
    });

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`ElevenLabs SFX failed for ${filename}: ${res.status} ${errTxt}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(`[OK] Generated ${filename} (${buf.length.toLocaleString()} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
