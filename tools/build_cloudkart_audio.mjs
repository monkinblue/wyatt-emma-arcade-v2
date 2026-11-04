#!/usr/bin/env node
/**
 * Node.js Companion for `tools/build_cloudkart_audio.py` (`tools/build_cloudkart_audio.mjs`)
 * Runs directly on Windows where `python` is the Microsoft Store stub.
 * Reads `ELEVENLABS_API_KEY` strictly from `.env` (never imported in `src/`) and generates:
 *   - `public/assets/audio/cloudkart/letters/letter_<a..z>.mp3`
 *   - `public/assets/audio/cloudkart/numbers/num_<0..9>.mp3`
 *   - `public/assets/audio/cloudkart/prompts/<id>.mp3`
 *   - `public/assets/audio/cloudkart/sfx/<id>.mp3`
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const LETTERS_DICT = {
  a: 'A.',
  b: 'Bee.',
  c: 'See.',
  d: 'Dee.',
  e: 'Ee.',
  f: 'Eff.',
  g: 'Jee.',
  h: 'Eightch.',
  i: 'Eye.',
  j: 'Jay.',
  k: 'Kay.',
  l: 'Ell.',
  m: 'Emm.',
  n: 'Enn.',
  o: 'Oh.',
  p: 'Pee.',
  q: 'Cue.',
  r: 'Are.',
  s: 'Ess.',
  t: 'Tee.',
  u: 'You.',
  v: 'Vee.',
  w: 'Double-you.',
  x: 'Ex.',
  y: 'Why.',
  z: 'Zee.'
};

const NUMBERS_DICT = {
  0: ['Zero.', "Let's count the numbers clearly.", 'One, two, three.'],
  1: ['One.', 'Zero.', 'Two, three, four.'],
  2: ['Two.', 'Zero, one.', 'Three, four, five.'],
  3: ['Three.', 'One, two.', 'Four, five, six.'],
  4: ['Four.', 'One, two, three.', 'Five, six, seven.'],
  5: ['Five.', 'Two, three, four.', 'Six, seven, eight.'],
  6: ['Six.', 'Three, four, five.', 'Seven, eight, nine.'],
  7: ['Seven.', 'Four, five, six.', 'Eight, nine.'],
  8: ['Eight.', 'Five, six, seven.', 'Nine, ten.'],
  9: ['Nine.', 'Six, seven, eight.', 'Ten.']
};

const PROMPTS_DICT = {
  welcome_title: 'Welcome to Zoomy Cloud Kart. Rainbow Hill Racer.',
  race_start_wyatt: 'Ready, Wyatt. Steer your Cloud Kart down Rainbow Hill.',
  race_start_emma: 'Ready, Emma. Steer your Cloud Kart down Rainbow Hill.',
  gate_intro_letter: 'Sky Gate ahead. Trace the letter from the green flag to power your rainbow boost.',
  gate_intro_number: 'Sky Gate ahead. Trace the number from the green flag to power your rainbow boost.',
  stroke_start_flag: 'Start at the green flag at the top.',
  stroke_next: 'Nice stroke. Now start at the next green flag.',
  stroke_stay_on_track: 'Stay on the glowing cloud track. Slide back to the green circle.',
  stroke_try_rewrite: "Canvas cleared. Let's write it fresh from the green flag.",
  admire_letter: 'Wonderful handwriting. Look at the letter you wrote.',
  admire_number: 'Wonderful handwriting. Look at the number you wrote.',
  turbo_boost_go: 'Mega rainbow turbo boost. Zoom through the clouds.',
  podium_wyatt: 'Congratulations, Wyatt. Look at all three letters you wrote on the championship banner.',
  podium_emma: 'Congratulations, Emma. Look at all three letters you wrote on the championship banner.',
  mode_uppercase: 'Uppercase letters mode. A through Z.',
  mode_numbers: 'Numbers mode. Zero through nine.',
  mode_mixed: 'Letters and numbers mix mode.',
  mode_sequential: 'In order mode.',
  mode_random: 'Surprise random mode.',
  track_precision: 'Standard precision track for Wyatt.',
  track_cozy: 'Wide cozy track for Emma.'
};

const SFX_DICT = {
  kart_engine_purr: [
    'Warm vintage clockwork roadster engine purring smoothly with gentle wind in the clouds',
    2.0
  ],
  rainbow_turbo_boost: [
    'Magical 32-bit arcade kart rainbow turbo boost whoosh with sparkling starlight chimes',
    1.8
  ],
  chalk_trace_loop: [
    'Soft magical golden starlight chalk gliding smoothly across a cloud canvas',
    1.5
  ],
  off_track_rumble: [
    'Gentle soft puffy cloud tire rumble and mild wooden spring bounce',
    1.0
  ],
  star_coin_chime: ['Bright cheerful arcade gold star coin pickup chime', 0.9],
  sky_gate_open: [
    'Grand brass clockwork archway opening with a warm magical harp glissando',
    1.8
  ],
  podium_fanfare: [
    'Joyful Nintendo style brass and harp championship podium celebration fanfare',
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
  previousText = "Let's practice writing our letters and numbers calmly.",
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

  const baseOutDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'cloudkart');
  const lettersDir = path.join(baseOutDir, 'letters');
  const numbersDir = path.join(baseOutDir, 'numbers');
  const promptsDir = path.join(baseOutDir, 'prompts');
  const sfxDir = path.join(baseOutDir, 'sfx');

  for (const d of [lettersDir, numbersDir, promptsDir, sfxDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // 1. Letters a..z
  const balloonLettersDir = path.join(ROOT_DIR, 'public', 'assets', 'audio', 'balloon-pop', 'letters');
  for (const [ch, spoken] of Object.entries(LETTERS_DICT)) {
    const outPath = path.join(lettersDir, `letter_${ch}.mp3`);
    if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 800) {
      console.log(`  [CACHE HIT] letters/letter_${ch}.mp3`);
      continue;
    }
    const srcCached = path.join(balloonLettersDir, `letter_${ch}.mp3`);
    if (!force && fs.existsSync(srcCached) && fs.statSync(srcCached).size > 800) {
      fs.copyFileSync(srcCached, outPath);
      console.log(`  [COPIED VERIFIED LETTER] letters/letter_${ch}.mp3`);
      continue;
    }
    const sizeB = await synthesizeVoiceMp3(
      apiKey,
      voiceId,
      spoken,
      outPath,
      'eleven_turbo_v2_5',
      "Let's say the alphabet letter clearly."
    );
    console.log(`  [GENERATED LETTER] letters/letter_${ch}.mp3 (${sizeB.toLocaleString()} bytes)`);
    await new Promise((r) => setTimeout(r, 90));
  }

  // 2. Numbers 0..9
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
    const sizeB = await synthesizeVoiceMp3(
      apiKey,
      voiceId,
      text,
      outPath,
      'eleven_turbo_v2_5',
      prevTxt,
      nextTxt
    );
    console.log(`  [GENERATED NUMBER] numbers/num_${numKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 90));
  }

  // 3. Prompts & Stroke Guidance
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
      "Let's guide the children warmly and calmly in our Cloud Kart handwriting game."
    );
    console.log(`  [GENERATED PROMPT] prompts/${promptKey}.mp3 (${sizeB.toLocaleString()} bytes) — '${text}'`);
    await new Promise((r) => setTimeout(r, 110));
  }

  // 4. SFX via ElevenLabs Sound Generation API
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
