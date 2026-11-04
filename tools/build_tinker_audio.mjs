#!/usr/bin/env node
/**
 * Node.js Companion for `tools/build_tinker_audio.py` (`tools/build_tinker_audio.mjs`)
 * Runs directly on Windows where `python` is the Microsoft Store stub.
 * Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported in `src/`) and generates:
 *   - `public/assets/audio/tinker/prompts/<id>.mp3`
 *   - `public/assets/audio/tinker/sfx/<id>.mp3`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PROMPTS_DICT = {
  welcome_title: "Welcome to Tinker Workshop. Let's build a marble run together.",
  mode_stars: "Star Challenge Mode. Guide the marble through all three golden stars into Doggie's minecart.",
  mode_sandbox: 'Free Sandbox Mode. Build any contraption you can imagine.',
  miss_trail_1: 'So close. Follow the dotted trail and nudge your ramp a little bit.',
  miss_trail_2: 'Nice test. Look at the glowing trail to see where the marble bounced, then tilt a piece.',
  miss_trail_3: 'Every test helps us learn. Try moving a ramp right onto the dotted path.',
  almost_stars: "Doggie caught the marble. Now let's angle our ramps to touch all three golden stars on the way down.",
  victory_wyatt: "Wonderful engineering, Wyatt. Your contraption collected all three stars and landed right in Doggie's cart.",
  victory_emma: "Wonderful engineering, Emma. Your contraption collected all three stars and landed right in Doggie's cart.",
  fountain_on: 'Marble shower ready. Watch all the marbles roll and bounce together.',
  gravity_moon: 'Moon gravity on. Everything floats gently.',
  gravity_normal: 'Normal workshop gravity.'
};

const SFX_DICT = {
  wood_tap_soft: [
    'Soft warm hardwood marble tap on a polished walnut wooden block',
    0.6
  ],
  wood_clack_hard: [
    'Crisp resonant hardwood marble clack against a solid walnut wooden ramp',
    0.7
  ],
  brass_bell_ding: [
    'Bright resonant antique brass bell ding in a warm wooden workshop',
    1.1
  ],
  spring_drum_boing: [
    'Tactile vintage brass spring and leather drum bumper boing bounce',
    0.9
  ],
  bellows_wind_whoosh: [
    'Warm Victorian leather bellows and brass fan upward air whoosh gust',
    1.2
  ],
  wood_roll_loop: [
    'Smooth glass marble rolling steadily along a carved hardwood wooden chute',
    2.0
  ],
  star_chime: [
    'Magical golden compass star pickup chime with warm glockenspiel sparkle',
    1.0
  ],
  funnel_spiral_drop: [
    'Glass marble swirling quickly inside a hammered copper funnel and dropping out',
    1.0
  ],
  paddle_wheel_whir: [
    'Mechanical clockwork brass paddle wheel spinning with warm wooden clicks',
    1.0
  ],
  minecart_catch_fanfare: [
    'Joyful Nintendo style wooden minecart catch and warm brass clockwork victory fanfare',
    2.5
  ]
};

function loadEnvFile(rootDir) {
  const envVars = {};
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const eqIdx = line.indexOf('=');
      const k = line.slice(0, eqIdx).trim();
      const v = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      envVars[k] = v;
    }
  }
  return envVars;
}

async function synthesizeVoiceMp3(
  apiKey,
  voiceId,
  text,
  outPath,
  modelId = 'eleven_turbo_v2_5',
  previousText = "Let's encourage the young builders calmly and warmly in our wooden marble workshop."
) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const payload = {
    text,
    model_id: modelId,
    previous_text: previousText,
    voice_settings: {
      stability: 0.86,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: false
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function synthesizeSfxMp3(apiKey, prompt, outPath, durationSeconds = 1.0) {
  const url = 'https://api.elevenlabs.io/v1/sound-generation';
  const payload = {
    text: prompt,
    duration_seconds: durationSeconds,
    prompt_influence: 0.5
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  const force = process.argv.includes('--force');
  const envVars = loadEnvFile(ROOT_DIR);
  const apiKey = (envVars.ELEVENLABS_API_KEY ?? '').trim();
  const voiceId = (envVars.ELEVENLABS_VOICE_ID ?? 'nzFihrBIvB34imQBuxub').trim();

  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env');
    process.exit(1);
  }

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'tinker');
  const promptsDir = path.join(baseOutDir, 'prompts');
  const sfxDir = path.join(baseOutDir, 'sfx');

  for (const d of [promptsDir, sfxDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  for (const [promptKey, text] of Object.entries(PROMPTS_DICT)) {
    const outPath = path.join(promptsDir, `${promptKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] prompts/${promptKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(apiKey, voiceId, text, outPath);
    console.log(`  [GENERATED PROMPT] prompts/${promptKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 110));
  }

  for (const [sfxKey, [sfxPrompt, dur]] of Object.entries(SFX_DICT)) {
    const outPath = path.join(sfxDir, `${sfxKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] sfx/${sfxKey}.mp3`);
      continue;
    }
    try {
      const sizeB = await synthesizeSfxMp3(apiKey, sfxPrompt, outPath, dur);
      console.log(`  [GENERATED SFX] sfx/${sfxKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${sfxPrompt}'`);
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      console.log(`  [SFX FALLBACK NOTE] sfx/${sfxKey}.mp3 (${err.message}) — WebAudio synth fallback will handle.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
