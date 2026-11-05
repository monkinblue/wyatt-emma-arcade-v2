#!/usr/bin/env node
/**
 * Node.js Companion for `tools/build_train_audio.py` (`tools/build_train_audio.mjs`)
 * Runs directly on Windows where `python` is the Microsoft Store stub.
 * Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported in `src/`) and generates:
 *   - `public/assets/audio/train/numbers/num_<1..5>.mp3`
 *   - `public/assets/audio/train/prompts/<id>.mp3`
 *   - `public/assets/audio/train/sfx/<id>.mp3`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const NUMBERS_DICT = {
  1: ['One.', "Let's count the wooden train cargo calmly.", 'Two, three, four, five.'],
  2: ['Two.', 'One.', 'Three, four, five.'],
  3: ['Three.', 'One, two.', 'Four, five.'],
  4: ['Four.', 'One, two, three.', 'Five.'],
  5: ['Five.', 'Two, three, four.', 'All aboard.']
};

const PROMPTS_DICT = {
  welcome_title:
    'Welcome to the Clockwork Train Table. Pull the golden rope to blow the whistle, or push the brass lever to go.',
  all_aboard: 'All aboard.',
  pulling_into_station: 'Pulling into Grand Central Station.',
  great_job_engineer: 'Great job, little engineer.',
  great_job_wyatt: 'Wonderful engineering, Wyatt and Sparky. The express train is rolling.',
  great_job_emma: 'Wonderful engineering, Emma and Doggie. The express train is rolling.',
  layout_meadow: 'Sunny Meadow Oval track ready.',
  layout_gorge: 'Royal Gorge Figure-Eight track ready.',
  layout_canyon: 'Winding Mountain Canyon track ready.',
  module_bridge: 'Royal Gorge Suspension Bridge snapped onto the rails.',
  module_tunnel: 'Echo Mountain Stone Tunnel snapped over the track.',
  module_xylophone: 'Rainbow Xylophone Melodic Track snapped into place.',
  module_crossing: 'Clanging Railroad Crossing Gate ready.',
  engineer_grandpa: 'Engineer Grandpa is in the cab.',
  engineer_wyatt: 'Engineer Wyatt is at the throttle.',
  engineer_emma: 'Princess Emma is riding the rails.',
  engineer_doggie: 'Conductor Doggie is ready with his cap.',
  engineer_sparky: 'Sparky is stoking the golden steam.',
  order_logs_2: 'Load two golden logs onto the train.',
  order_logs_3: 'Load three golden logs onto the train.',
  order_logs_4: 'Load four golden logs onto the train.',
  order_barrels_2: 'Load two strawberry milk barrels.',
  order_barrels_3: 'Load three strawberry milk barrels.',
  order_barrels_5: 'Load five strawberry milk barrels.',
  order_chests_2: 'Load two treasure chests.',
  order_chests_3: 'Load three treasure chests.',
  order_chests_4: 'Load four treasure chests.',
  order_crates_1: 'Load one crystal star crate.',
  order_crates_3: 'Load three crystal star crates.',
  order_crates_4: 'Load four crystal star crates.',
  done_logs: 'Golden logs loaded. All aboard.',
  done_barrels: 'Strawberry milk barrels loaded. All aboard.',
  done_chests: 'Treasure chests loaded. All aboard.',
  done_crates: 'Crystal star crates loaded. All aboard.'
};

const SFX_DICT = {
  steam_whistle: [
    'Warm joyful vintage brass dual-chime steam locomotive train whistle choo choo',
    1.6
  ],
  tunnel_echo_whistle: [
    'Echoing vintage steam train whistle inside a deep stone mountain canyon tunnel',
    1.8
  ],
  crossing_bell: [
    'Classic mechanical brass railroad crossing signal bell clanging ding ding ding ding',
    1.5
  ],
  wood_track_clack: [
    'Crisp tactile carved beechwood Brio toy train track piece snapping into place',
    0.8
  ],
  steam_brake_hiss: [
    'Warm vintage steam locomotive brass air brake release pssshhh hiss',
    1.2
  ],
  cargo_crane_thunk: [
    'Tactile wooden crane dropping a chunky wooden cargo block into a toy train car with a spring bounce',
    1.0
  ],
  water_tower_splash: [
    'Playful wooden railroad water tower spout pouring a splash of water into a steam tank',
    1.3
  ],
  trex_friendly_roar: [
    'Cute playful friendly cartoon dinosaur roar and wooden toy jaw clack',
    1.3
  ],
  unicorn_whinny_sparkle: [
    'Magical gentle pony whinny with sparkling crystal chimes',
    1.4
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
  previousText = "Let's guide our young train engineers calmly and warmly.",
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

async function synthesizeSfxMp3(apiKey, prompt, outPath, durationSeconds = 1.3) {
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

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'train');
  const numbersDir = path.join(baseOutDir, 'numbers');
  const promptsDir = path.join(baseOutDir, 'prompts');
  const sfxDir = path.join(baseOutDir, 'sfx');

  for (const d of [numbersDir, promptsDir, sfxDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const stbNumbersDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'shutthebox', 'numbers');

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
    console.log(`  [GENERATED NUMBER] numbers/num_${numKey}.mp3 (${sizeB.toLocaleString()} bytes)`);
    await new Promise((r) => setTimeout(r, 85));
  }

  for (const [promptKey, text] of Object.entries(PROMPTS_DICT)) {
    const outPath = path.join(promptsDir, `${promptKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] prompts/${promptKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(apiKey, voiceId, text, outPath);
    console.log(`  [GENERATED PROMPT] prompts/${promptKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 95));
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
      await new Promise((r) => setTimeout(r, 140));
    } catch (err) {
      console.log(`  [SFX FALLBACK NOTE] sfx/${sfxKey}.mp3 (${err.message}) — WebAudio synth fallback will handle.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
