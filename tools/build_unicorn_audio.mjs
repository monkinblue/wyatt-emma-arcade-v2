#!/usr/bin/env node
/**
 * Node.js Companion for `tools/build_unicorn_audio.py` (`tools/build_unicorn_audio.mjs`)
 * Runs directly on Windows where `python` is the Microsoft Store stub.
 * Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported in `src/`) and generates:
 *   - `public/assets/audio/unicorn/numbers/num_<1..5>.mp3`
 *   - `public/assets/audio/unicorn/shapes/<id>.mp3`
 *   - `public/assets/audio/unicorn/prompts/<id>.mp3`
 *   - `public/assets/audio/unicorn/sfx/<id>.mp3`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const NUMBERS_DICT = {
  1: ['One.', "Let's count the royal treats calmly.", 'Two, three, four.'],
  2: ['Two.', 'One.', 'Three, four, five.'],
  3: ['Three.', 'One, two.', 'Four, five.'],
  4: ['Four.', 'One, two, three.', 'Five.'],
  5: ['Five.', 'Two, three, four.', 'Wonderful counting.']
};

const SHAPES_AND_COLORS_DICT = {
  pink_heart: 'Pink heart.',
  purple_star: 'Purple star.',
  blue_diamond: 'Blue diamond.',
  yellow_circle: 'Yellow circle.',
  green_square: 'Green square.',
  red_circle: 'Red circle.',
  yellow_star: 'Yellow star.',
  blue_triangle: 'Blue triangle.',
  color_pink: 'Rose pink.',
  color_blue: 'Sky blue.',
  color_lavender: 'Royal lavender.',
  color_gold: 'Sunshine gold.',
  pattern_match: 'What a lovely royal pattern.'
};

const PROMPTS_DICT = {
  welcome_title: "Welcome to Princess Emma's Unicorn Castle. Royal Sticker Kingdom.",
  room_spa: "Let's brush the unicorn's mane.",
  room_teaparty: 'Time for the royal tea party.',
  room_stickers: 'Pick a magical sticker for the castle.',
  spa_wash_bubbles: 'Lovely bubbly shampoo. Now rinse with the golden cloud shower.',
  spa_rinse_clean: 'All clean and sparkling.',
  spa_tiara_prompt: 'Match the crystal gems to the royal crown.',
  spa_tiara_complete: 'The royal unicorn crown is complete.',
  tea_pour_complete: 'Warm rainbow tea is served.',
  tea_count_one: 'One royal treat.',
  tea_count_cookies: 'Two star cookies.',
  tea_count_cupcakes: 'Three cupcakes.',
  tea_count_hearts: 'Four sugar hearts.',
  tea_count_berries: 'Five rainbow berries.',
  tea_care_blanket: 'So warm and cozy under the royal blanket.',
  tea_care_pillow: 'Sweet dreams on the starlight pillow.',
  tea_care_tickle: 'What a happy royal tickle.',
  spatial_high_sky: 'Can you stick a rainbow high up in the sky.',
  spatial_next_to_emma: "Let's put a baby unicorn next to Princess Emma.",
  spatial_on_stairs: 'Try placing a royal friend on the grand staircase.',
  spatial_by_water: 'Can you place a friend near the sparkling water.'
};

const SFX_DICT = {
  shampoo_bubbles: [
    'Gentle magical soapy shampoo bubble lathering and soft sparkling foam pops',
    1.4
  ],
  waterfall_rinse: [
    'Warm gentle golden cloud shower water rinsing and soft crystal droplets',
    1.6
  ],
  gem_socket_chime: [
    'Crisp crystal gem snapping into a golden crown socket with a bright magical bell chime',
    1.1
  ],
  teapot_pour: [
    'Gentle porcelain teapot pouring warm tea into a teacup with a soft musical shimmer',
    1.6
  ],
  unicorn_whinny: [
    'Cute gentle friendly magical baby unicorn nuzzle and soft happy whinny',
    1.5
  ],
  teacup_clink: [
    'Delicate royal porcelain teacup and silver spoon clink with a warm chime',
    0.9
  ],
  sticker_peel: [
    'Crisp tactile paper sticker peeling and sticking onto a storybook page with a soft pop',
    0.9
  ],
  royal_fanfare: [
    'Warm enchanting harp and celesta music box royal princess castle fanfare',
    2.6
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
  previousText = "Let's read a warm, gentle fairy tale for three year old Princess Emma.",
  nextText = ''
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
  if (nextText) {
    payload.next_text = nextText;
  }
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

async function synthesizeSfxMp3(apiKey, prompt, outPath, durationSeconds = 1.5) {
  const url = 'https://api.elevenlabs.io/v1/sound-generation';
  const payload = {
    text: prompt,
    duration_seconds: durationSeconds,
    prompt_influence: 0.45
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
    console.error('ERROR: ELEVENLABS_API_KEY not found in .env!');
    process.exit(1);
  }

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'unicorn');
  const numbersDir = path.join(baseOutDir, 'numbers');
  const shapesDir = path.join(baseOutDir, 'shapes');
  const promptsDir = path.join(baseOutDir, 'prompts');
  const sfxDir = path.join(baseOutDir, 'sfx');

  for (const d of [numbersDir, shapesDir, promptsDir, sfxDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const stbNumbersDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'shutthebox', 'numbers');

  // 1. Numbers 1..5
  for (const [numKey, [text, prevTxt, nextTxt]] of Object.entries(NUMBERS_DICT)) {
    const outPath = path.join(numbersDir, `num_${numKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] numbers/num_${numKey}.mp3`);
      continue;
    }
    const srcCached = path.join(stbNumbersDir, `num_${numKey}.mp3`);
    if (!force && fs.existsSync(srcCached) && fs.statSync(srcCached).size > 800) {
      fs.copyFileSync(srcCached, outPath);
      console.log(`  [COPIED VERIFIED NUMBER] numbers/num_${numKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(apiKey, voiceId, text, outPath, 'eleven_turbo_v2_5', prevTxt, nextTxt);
    console.log(`  [GENERATED NUMBER] numbers/num_${numKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 90));
  }

  // 2. Colors & Shapes
  for (const [shapeKey, text] of Object.entries(SHAPES_AND_COLORS_DICT)) {
    const outPath = path.join(shapesDir, `${shapeKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] shapes/${shapeKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(
      apiKey,
      voiceId,
      text,
      outPath,
      'eleven_turbo_v2_5',
      "Let's name the royal crystal gem shapes and colors calmly and clearly."
    );
    console.log(`  [GENERATED SHAPE/COLOR] shapes/${shapeKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 90));
  }

  // 3. Pretend-Play Encouragement & Room Prompts
  for (const [promptKey, text] of Object.entries(PROMPTS_DICT)) {
    const outPath = path.join(promptsDir, `${promptKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] prompts/${promptKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(
      apiKey,
      voiceId,
      text,
      outPath,
      'eleven_turbo_v2_5',
      "Let's guide three year old Princess Emma warmly and gently in her Unicorn Castle."
    );
    console.log(`  [GENERATED PROMPT] prompts/${promptKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 110));
  }

  // 4. Magical Unicorn Castle SFX
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
