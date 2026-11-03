/**
 * tools/build_colorado_p3_sfx.mjs
 * -------------------------------
 * Node.js companion runner for `tools/build_colorado_p3_sfx.py`:
 * Generates the 14 single-concept atomic Page 3 ("Manitou Springs Penny Arcade")
 * sound effects in `public/assets/audio/colorado/sfx/` using `ELEVENLABS_API_KEY` from `.env`.
 * Never modifies or regenerates Page 3's voice narration MP3!
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const SFX_DIR = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'colorado', 'sfx');

const P3_SFX_SPECS = [
  [
    'p3_ambient_arcade_loop.mp3',
    'Classic family penny arcade room ambience with gentle vintage arcade cabinet hums and distant cheerful arcade chimes',
    14.0
  ],
  [
    'p3_skeeball_roll.mp3',
    'Heavy wooden ball rolling fast up a smooth wooden bowling lane track',
    1.8
  ],
  [
    'p3_skeeball_ding.mp3',
    'Bright retro mechanical arcade scoreboard bell ding-ding-ding',
    1.5
  ],
  [
    'p3_tickets_dispense.mp3',
    'Fast paper arcade ticket dispenser whirring and fluttering paper strip',
    2.0
  ],
  [
    'p3_emma_giggle.mp3',
    'Happy 3-year-old little girl joyful giggle',
    1.8
  ],
  [
    'p3_grandparents_clap.mp3',
    'Warm enthusiastic hand clapping and cheerful applause',
    2.0
  ],
  [
    'p3_pony_spring.mp3',
    'Rhythmic heavy metal coil spring bouncing boing-squeak-boing',
    2.2
  ],
  [
    'p3_doggie_squeak.mp3',
    'Cute rubber squeaky toy puppy double bark yip-yip',
    1.5
  ],
  [
    'p3_claw_servo.mp3',
    'Small electric toy crane motor servo whirring down and clicking shut',
    2.2
  ],
  [
    'p3_sparky_chime.mp3',
    'Playful magical crystal sparkle chime',
    1.8
  ],
  [
    'p3_fortune_organ.mp3',
    'Warm mystical carnival calliope organ chord shimmer',
    2.5
  ],
  [
    'p3_wheel_spin.mp3',
    'Plastic prize wheel pegs clicking rapidly tick-tick-tick-tick slowing to a stop',
    2.5
  ],
  [
    'p3_pinball_bumpers.mp3',
    'Classic mechanical pinball machine solenoids and pop bumpers rapidly kicking thump-thump-thump',
    2.2
  ],
  [
    'p3_pinball_bells.mp3',
    'Vintage pinball machine high score chimes and metallic bells ringing',
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

  for (const [filename, prompt, durationSeconds] of P3_SFX_SPECS) {
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
    console.log(`  [GENERATED P3 SFX] sfx/${filename} (${buf.length.toLocaleString()} bytes) — '${prompt}'`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
