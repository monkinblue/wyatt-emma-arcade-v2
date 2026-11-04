#!/usr/bin/env node
/**
 * Node.js Companion for `tools/build_rocket_audio.py` (`tools/build_rocket_audio.mjs`)
 * Runs directly on Windows where `python` is the Microsoft Store stub.
 * Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported in `src/`) and generates:
 *   - `public/assets/audio/rocket/numbers/num_<1..19, 20..90, 100..900>.mp3`
 *   - `public/assets/audio/rocket/prompts/<id>.mp3`
 *   - `public/assets/audio/rocket/sfx/<id>.mp3`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const ONES_AND_TEENS_DICT = {
  1: ['One.', "Let's count the numbers clearly.", 'Two, three, four.'],
  2: ['Two.', 'One.', 'Three, four, five.'],
  3: ['Three.', 'One, two.', 'Four, five, six.'],
  4: ['Four.', 'One, two, three.', 'Five, six, seven.'],
  5: ['Five.', 'Two, three, four.', 'Six, seven, eight.'],
  6: ['Six.', 'Three, four, five.', 'Seven, eight, nine.'],
  7: ['Seven.', 'Four, five, six.', 'Eight, nine, ten.'],
  8: ['Eight.', 'Five, six, seven.', 'Nine, ten, eleven.'],
  9: ['Nine.', 'Six, seven, eight.', 'Ten, eleven, twelve.'],
  10: ['Ten.', 'Seven, eight, nine.', 'Eleven, twelve.'],
  11: ['Eleven.', 'Eight, nine, ten.', 'Twelve, thirteen.'],
  12: ['Twelve.', 'Nine, ten, eleven.', 'Thirteen, fourteen.'],
  13: ['Thirteen.', 'Ten, eleven, twelve.', 'Fourteen, fifteen.'],
  14: ['Fourteen.', 'Eleven, twelve, thirteen.', 'Fifteen, sixteen.'],
  15: ['Fifteen.', 'Twelve, thirteen, fourteen.', 'Sixteen, seventeen.'],
  16: ['Sixteen.', 'Thirteen, fourteen, fifteen.', 'Seventeen, eighteen.'],
  17: ['Seventeen.', 'Fourteen, fifteen, sixteen.', 'Eighteen, nineteen.'],
  18: ['Eighteen.', 'Fifteen, sixteen, seventeen.', 'Nineteen, twenty.'],
  19: ['Nineteen.', 'Sixteen, seventeen, eighteen.', 'Twenty.']
};

const TENS_DICT = {
  20: ['Twenty.', 'Ten.', 'Thirty, forty.'],
  30: ['Thirty.', 'Ten, twenty.', 'Forty, fifty.'],
  40: ['Forty.', 'Twenty, thirty.', 'Fifty, sixty.'],
  50: ['Fifty.', 'Thirty, forty.', 'Sixty, seventy.'],
  60: ['Sixty.', 'Forty, fifty.', 'Seventy, eighty.'],
  70: ['Seventy.', 'Fifty, sixty.', 'Eighty, ninety.'],
  80: ['Eighty.', 'Sixty, seventy.', 'Ninety, one hundred.'],
  90: ['Ninety.', 'Seventy, eighty.', 'One hundred.']
};

const HUNDREDS_DICT = {
  100: ['One hundred.', "Let's count by hundreds.", 'Two hundred, three hundred.'],
  200: ['Two hundred.', 'One hundred.', 'Three hundred, four hundred.'],
  300: ['Three hundred.', 'One hundred, two hundred.', 'Four hundred, five hundred.'],
  400: ['Four hundred.', 'Two hundred, three hundred.', 'Five hundred, six hundred.'],
  500: ['Five hundred.', 'Three hundred, four hundred.', 'Six hundred, seven hundred.'],
  600: ['Six hundred.', 'Four hundred, five hundred.', 'Seven hundred, eight hundred.'],
  700: ['Seven hundred.', 'Five hundred, six hundred.', 'Eight hundred, nine hundred.'],
  800: ['Eight hundred.', 'Six hundred, seven hundred.', 'Nine hundred.'],
  900: ['Nine hundred.', 'Seven hundred, eight hundred.', 'Great counting.']
};

const PROMPTS_DICT = {
  welcome_title: 'Welcome to Rocket Number Blast. Starlight Launchpad.',
  mode_star_hopper: 'Star Hopper mode. Numbers one through ten.',
  mode_lunar_cadet: 'Lunar Cadet mode. Tens and ones.',
  mode_commander: 'Commander mode. Hundreds, tens, and ones.',
  mission_wyatt: 'Ready, Commander Wyatt. Fuel the rocket to match the target number.',
  mission_emma: 'Ready, Star Hopper Emma. Tap the glowing stars to fuel the rocket.',
  ready_for_launch: 'Target number matched. Pull the big red launch lever.',
  countdown_3: 'Three.',
  countdown_2: 'Two.',
  countdown_1: 'One.',
  blast_off: 'Blast off.',
  stage_separation: 'Stage separation.',
  over_fuel_valve: 'Too much fuel in that tank. Pull the steam valve.',
  steam_released: 'Steam released. Tank level adjusted.',
  landing_cheese_moon: 'Touchdown on the Cheese Moon. Look at your space flag.',
  landing_mars_saturn: 'Touchdown on the Red Craters of Mars. Look at your space flag.',
  landing_crystal_nebula: 'Touchdown at the Crystal Nebula Space Station. Look at your space flag.'
};

const SFX_DICT = {
  laser_chime_1: [
    'Bright high crystal starlight laser beam zing and magical bell chime',
    0.9
  ],
  laser_chord_10: [
    'Rich golden constellation laser beam whoosh and warm celestial chord chime',
    1.1
  ],
  laser_supernova_100: [
    'Deep resonant sapphire supernova plasma beam thrum and cosmic brass pulse',
    1.4
  ],
  gantry_clamps: [
    'Heavy antique brass hydraulic launch gantry clamps retracting with mechanical hiss',
    1.6
  ],
  steam_whistle_valve: [
    'Funny tactile brass steam whistle valve release pssshhh pop with playful puff',
    1.3
  ],
  rocket_engine_roar: [
    'Warm powerful retro moon rocket engine ignition roar and rumbling ascent thrust',
    2.6
  ],
  stage_separation_pyro: [
    'Crisp mechanical rocket booster stage separation bolts popping and upper stage thruster ignition',
    1.6
  ],
  planet_flag_fanfare: [
    'Joyful Nintendo style cosmic brass and starry harp planetary touchdown flag fanfare',
    2.8
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
  previousText = "Let's count our rocket fuel numbers calmly.",
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

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'rocket');
  const numbersDir = path.join(baseOutDir, 'numbers');
  const promptsDir = path.join(baseOutDir, 'prompts');
  const sfxDir = path.join(baseOutDir, 'sfx');

  for (const d of [numbersDir, promptsDir, sfxDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const stbNumbersDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'shutthebox', 'numbers');

  // 1. Ones & Teens (1..19)
  for (const [numKey, [text, prevTxt, nextTxt]] of Object.entries(ONES_AND_TEENS_DICT)) {
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

  // 2. Tens (20..90)
  for (const [numKey, [text, prevTxt, nextTxt]] of Object.entries(TENS_DICT)) {
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
    console.log(`  [GENERATED TENS] numbers/num_${numKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 90));
  }

  // 3. Hundreds (100..900)
  for (const [numKey, [text, prevTxt, nextTxt]] of Object.entries(HUNDREDS_DICT)) {
    const outPath = path.join(numbersDir, `num_${numKey}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] numbers/num_${numKey}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(apiKey, voiceId, text, outPath, 'eleven_turbo_v2_5', prevTxt, nextTxt);
    console.log(`  [GENERATED HUNDREDS] numbers/num_${numKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 90));
  }

  // 4. Mission Prompts & Countdown Cues
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
      "Let's guide the children warmly and calmly in our Rocket Number Blast space game."
    );
    console.log(`  [GENERATED PROMPT] prompts/${promptKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 110));
  }

  // 5. Space Rocketry SFX via ElevenLabs Sound Generation API
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
