/**
 * tools/build_colorado_p2_sfx.mjs
 * -------------------------------
 * Node.js companion runner for `tools/build_colorado_p2_sfx.py`:
 * Generates the 8 Page 2 sound effects in `public/assets/audio/colorado/sfx/`
 * using `ELEVENLABS_API_KEY` from `.env` (`POST https://api.elevenlabs.io/v1/sound-generation`).
 * Never modifies or regenerates Page 2's voice narration MP3!
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

const P2_SFX_SPECS = [
  [
    'p2_ambient_morning.mp3',
    'Sunny peaceful Colorado suburban morning ambience with gentle breeze, distant cheerful songbirds, and soft leaves rustling',
    6.0
  ],
  [
    'p2_kids_run_giggle.mp3',
    'Two happy young children running footsteps on sidewalk with joyful toddler giggles and excited cheering',
    2.5
  ],
  [
    'p2_grandparents_hug.mp3',
    'Warm loving grandparents welcoming laugh, cheerful hand claps, and a cozy heartwarming chime',
    2.2
  ],
  [
    'p2_chimney_sparky.mp3',
    'Cute friendly baby dragon popping out of a metal chimney with a playful puff of magical golden sparkles and chirp',
    2.2
  ],
  [
    'p2_bush_doggie.mp3',
    'Leafy green bush rustling followed by a cute stuffed puppy toy double squeak-bark yip-yip',
    1.8
  ],
  [
    'p2_lavender_butterflies.mp3',
    'Gentle magical harp sparkle glissando with soft fluttering butterfly wings and a cute bumblebee buzz',
    2.2
  ],
  [
    'p2_lawn_sprinkler.mp3',
    'Classic lawn sprinkler popping up tchk-tchk-tchk-pssshhh spraying refreshing water droplets in the sun',
    2.5
  ],
  [
    'p2_squirrel_juggle.mp3',
    'Cute red pine squirrel excited chatter followed by playful cartoon juggling whooshes and pinecone catches',
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

  for (const [filename, prompt, durationSeconds] of P2_SFX_SPECS) {
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
    console.log(`  [GENERATED P2 SFX] sfx/${filename} (${buf.length.toLocaleString()} bytes) — '${prompt}'`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
